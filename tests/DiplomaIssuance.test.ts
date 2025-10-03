import { describe, it, expect, beforeEach } from "vitest";
import { buffCV, stringUtf8CV, uintCV, listCV } from "@stacks/transactions";

const ERR_NOT_AUTHORIZED = 100;
const ERR_INVALID_INSTITUTION = 101;
const ERR_INVALID_STUDENT = 102;
const ERR_INVALID_TEMPLATE = 103;
const ERR_INVALID_HASH = 104;
const ERR_INVALID_ISSUANCE_DATE = 105;
const ERR_DIPLOMA_ALREADY_ISSUED = 106;
const ERR_DIPLOMA_NOT_FOUND = 107;
const ERR_INVALID_DEGREE_TYPE = 111;
const ERR_INVALID_GPA = 110;
const ERR_INVALID_HONORS = 115;
const ERR_INVALID_MAJOR = 116;
const ERR_INVALID_MINOR = 117;
const ERR_INVALID_LOCATION = 118;
const ERR_INVALID_CURRENCY = 119;
const ERR_INVALID_EXPIRY = 121;
const ERR_INVALID_CREDITS = 122;
const ERR_INVALID_THESIS = 123;
const ERR_INVALID_ADVISOR = 124;
const ERR_INVALID_COMMITTEE = 125;
const ERR_MAX_DIPLOMAS_EXCEEDED = 114;
const ERR_INVALID_UPDATE_PARAM = 113;
const ERR_INSTITUTION_NOT_VERIFIED = 109;

interface Diploma {
  institutionId: number;
  studentId: number;
  templateId: number;
  contentHash: Uint8Array;
  issuanceDate: number;
  timestamp: number;
  issuer: string;
  degreeType: string;
  gpa: number;
  honors: string;
  major: string;
  minor: string;
  location: string;
  currency: string;
  status: boolean;
  expiry: number;
  credits: number;
  thesisTitle: string;
  advisor: string;
  committee: string[];
}

interface DiplomaUpdate {
  updateGpa: number;
  updateHonors: string;
  updateTimestamp: number;
  updater: string;
}

interface Result<T> {
  ok: boolean;
  value: T;
}

class DiplomaIssuanceMock {
  state: {
    nextDiplomaId: number;
    maxDiplomas: number;
    issuanceFee: number;
    authorityContract: string | null;
    diplomas: Map<number, Diploma>;
    diplomaUpdates: Map<number, DiplomaUpdate>;
    diplomasByHash: Map<string, number>;
  } = {
    nextDiplomaId: 0,
    maxDiplomas: 1000000,
    issuanceFee: 100,
    authorityContract: null,
    diplomas: new Map(),
    diplomaUpdates: new Map(),
    diplomasByHash: new Map(),
  };
  blockHeight: number = 0;
  caller: string = "ST1TEST";
  authorities: Set<string> = new Set(["ST1TEST"]);
  stxTransfers: Array<{ amount: number; from: string; to: string | null }> = [];

  constructor() {
    this.reset();
  }

  reset() {
    this.state = {
      nextDiplomaId: 0,
      maxDiplomas: 1000000,
      issuanceFee: 100,
      authorityContract: null,
      diplomas: new Map(),
      diplomaUpdates: new Map(),
      diplomasByHash: new Map(),
    };
    this.blockHeight = 0;
    this.caller = "ST1TEST";
    this.authorities = new Set(["ST1TEST"]);
    this.stxTransfers = [];
  }

  isVerifiedAuthority(principal: string): Result<boolean> {
    return { ok: true, value: this.authorities.has(principal) };
  }

  setAuthorityContract(contractPrincipal: string): Result<boolean> {
    if (contractPrincipal === "SP000000000000000000002Q6VF78") {
      return { ok: false, value: false };
    }
    if (this.state.authorityContract !== null) {
      return { ok: false, value: false };
    }
    this.state.authorityContract = contractPrincipal;
    return { ok: true, value: true };
  }

  setIssuanceFee(newFee: number): Result<boolean> {
    if (!this.state.authorityContract) return { ok: false, value: false };
    this.state.issuanceFee = newFee;
    return { ok: true, value: true };
  }

  issueDiploma(
    institutionId: number,
    studentId: number,
    templateId: number,
    contentHash: Uint8Array,
    issuanceDate: number,
    degreeType: string,
    gpa: number,
    honors: string,
    major: string,
    minor: string,
    location: string,
    currency: string,
    expiry: number,
    credits: number,
    thesisTitle: string,
    advisor: string,
    committee: string[]
  ): Result<number> {
    if (this.state.nextDiplomaId >= this.state.maxDiplomas) return { ok: false, value: ERR_MAX_DIPLOMAS_EXCEEDED };
    if (institutionId <= 0) return { ok: false, value: ERR_INVALID_INSTITUTION };
    if (studentId <= 0) return { ok: false, value: ERR_INVALID_STUDENT };
    if (templateId <= 0) return { ok: false, value: ERR_INVALID_TEMPLATE };
    if (contentHash.length !== 32) return { ok: false, value: ERR_INVALID_HASH };
    if (issuanceDate < this.blockHeight) return { ok: false, value: ERR_INVALID_ISSUANCE_DATE };
    if (!["Bachelor", "Master", "PhD"].includes(degreeType)) return { ok: false, value: ERR_INVALID_DEGREE_TYPE };
    if (gpa < 0 || gpa > 400) return { ok: false, value: ERR_INVALID_GPA };
    if (honors.length > 50) return { ok: false, value: ERR_INVALID_HONORS };
    if (!major || major.length > 100) return { ok: false, value: ERR_INVALID_MAJOR };
    if (minor.length > 100) return { ok: false, value: ERR_INVALID_MINOR };
    if (!location || location.length > 100) return { ok: false, value: ERR_INVALID_LOCATION };
    if (!["STX", "USD", "BTC"].includes(currency)) return { ok: false, value: ERR_INVALID_CURRENCY };
    if (expiry < this.blockHeight) return { ok: false, value: ERR_INVALID_EXPIRY };
    if (credits <= 0) return { ok: false, value: ERR_INVALID_CREDITS };
    if (thesisTitle.length > 200) return { ok: false, value: ERR_INVALID_THESIS };
    if (advisor.length > 100) return { ok: false, value: ERR_INVALID_ADVISOR };
    if (committee.length > 5) return { ok: false, value: ERR_INVALID_COMMITTEE };
    if (!this.isVerifiedAuthority(this.caller).value) return { ok: false, value: ERR_NOT_AUTHORIZED };
    const hashKey = contentHash.toString();
    if (this.state.diplomasByHash.has(hashKey)) return { ok: false, value: ERR_DIPLOMA_ALREADY_ISSUED };
    if (!this.state.authorityContract) return { ok: false, value: ERR_INSTITUTION_NOT_VERIFIED };

    this.stxTransfers.push({ amount: this.state.issuanceFee, from: this.caller, to: this.state.authorityContract });

    const id = this.state.nextDiplomaId;
    const diploma: Diploma = {
      institutionId,
      studentId,
      templateId,
      contentHash,
      issuanceDate,
      timestamp: this.blockHeight,
      issuer: this.caller,
      degreeType,
      gpa,
      honors,
      major,
      minor,
      location,
      currency,
      status: true,
      expiry,
      credits,
      thesisTitle,
      advisor,
      committee,
    };
    this.state.diplomas.set(id, diploma);
    this.state.diplomasByHash.set(hashKey, id);
    this.state.nextDiplomaId++;
    return { ok: true, value: id };
  }

  getDiploma(id: number): Diploma | null {
    return this.state.diplomas.get(id) || null;
  }

  updateDiploma(id: number, updateGpa: number, updateHonors: string): Result<boolean> {
    const diploma = this.state.diplomas.get(id);
    if (!diploma) return { ok: false, value: false };
    if (diploma.issuer !== this.caller) return { ok: false, value: false };
    if (updateGpa < 0 || updateGpa > 400) return { ok: false, value: false };
    if (updateHonors.length > 50) return { ok: false, value: false };

    const updated: Diploma = {
      ...diploma,
      gpa: updateGpa,
      honors: updateHonors,
      timestamp: this.blockHeight,
    };
    this.state.diplomas.set(id, updated);
    this.state.diplomaUpdates.set(id, {
      updateGpa,
      updateHonors,
      updateTimestamp: this.blockHeight,
      updater: this.caller,
    });
    return { ok: true, value: true };
  }

  getDiplomaCount(): Result<number> {
    return { ok: true, value: this.state.nextDiplomaId };
  }

  checkDiplomaExistence(hash: Uint8Array): Result<boolean> {
    return { ok: true, value: this.state.diplomasByHash.has(hash.toString()) };
  }
}

describe("DiplomaIssuance", () => {
  let contract: DiplomaIssuanceMock;

  beforeEach(() => {
    contract = new DiplomaIssuanceMock();
    contract.reset();
  });

  it("issues a diploma successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const hash = new Uint8Array(32).fill(1);
    const result = contract.issueDiploma(
      1,
      1,
      1,
      hash,
      100,
      "Bachelor",
      350,
      "Cum Laude",
      "Computer Science",
      "Math",
      "University City",
      "STX",
      200,
      120,
      "AI Thesis",
      "Dr. Smith",
      ["Dr. A", "Dr. B"]
    );
    expect(result.ok).toBe(true);
    expect(result.value).toBe(0);

    const diploma = contract.getDiploma(0);
    expect(diploma?.institutionId).toBe(1);
    expect(diploma?.studentId).toBe(1);
    expect(diploma?.templateId).toBe(1);
    expect(diploma?.contentHash).toEqual(hash);
    expect(diploma?.issuanceDate).toBe(100);
    expect(diploma?.degreeType).toBe("Bachelor");
    expect(diploma?.gpa).toBe(350);
    expect(diploma?.honors).toBe("Cum Laude");
    expect(diploma?.major).toBe("Computer Science");
    expect(diploma?.minor).toBe("Math");
    expect(diploma?.location).toBe("University City");
    expect(diploma?.currency).toBe("STX");
    expect(diploma?.expiry).toBe(200);
    expect(diploma?.credits).toBe(120);
    expect(diploma?.thesisTitle).toBe("AI Thesis");
    expect(diploma?.advisor).toBe("Dr. Smith");
    expect(diploma?.committee).toEqual(["Dr. A", "Dr. B"]);
    expect(contract.stxTransfers).toEqual([{ amount: 100, from: "ST1TEST", to: "ST2TEST" }]);
  });

  it("rejects duplicate diploma hashes", () => {
    contract.setAuthorityContract("ST2TEST");
    const hash = new Uint8Array(32).fill(1);
    contract.issueDiploma(
      1,
      1,
      1,
      hash,
      100,
      "Bachelor",
      350,
      "Cum Laude",
      "Computer Science",
      "Math",
      "University City",
      "STX",
      200,
      120,
      "AI Thesis",
      "Dr. Smith",
      ["Dr. A", "Dr. B"]
    );
    const result = contract.issueDiploma(
      2,
      2,
      2,
      hash,
      150,
      "Master",
      380,
      "Magna Cum Laude",
      "Engineering",
      "Physics",
      "Tech Town",
      "USD",
      250,
      60,
      "ML Thesis",
      "Dr. Johnson",
      ["Dr. C", "Dr. D"]
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_DIPLOMA_ALREADY_ISSUED);
  });

  it("rejects non-authorized caller", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.caller = "ST2FAKE";
    contract.authorities = new Set();
    const hash = new Uint8Array(32).fill(2);
    const result = contract.issueDiploma(
      1,
      1,
      1,
      hash,
      100,
      "Bachelor",
      350,
      "Cum Laude",
      "Computer Science",
      "Math",
      "University City",
      "STX",
      200,
      120,
      "AI Thesis",
      "Dr. Smith",
      ["Dr. A", "Dr. B"]
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_NOT_AUTHORIZED);
  });

  it("rejects diploma issuance without authority contract", () => {
    const hash = new Uint8Array(32).fill(4);
    const result = contract.issueDiploma(
      1,
      1,
      1,
      hash,
      100,
      "Bachelor",
      350,
      "Cum Laude",
      "Computer Science",
      "Math",
      "University City",
      "STX",
      200,
      120,
      "AI Thesis",
      "Dr. Smith",
      ["Dr. A", "Dr. B"]
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INSTITUTION_NOT_VERIFIED);
  });

  it("rejects invalid gpa", () => {
    contract.setAuthorityContract("ST2TEST");
    const hash = new Uint8Array(32).fill(5);
    const result = contract.issueDiploma(
      1,
      1,
      1,
      hash,
      100,
      "Bachelor",
      450,
      "Cum Laude",
      "Computer Science",
      "Math",
      "University City",
      "STX",
      200,
      120,
      "AI Thesis",
      "Dr. Smith",
      ["Dr. A", "Dr. B"]
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_GPA);
  });

  it("rejects invalid degree type", () => {
    contract.setAuthorityContract("ST2TEST");
    const hash = new Uint8Array(32).fill(6);
    const result = contract.issueDiploma(
      1,
      1,
      1,
      hash,
      100,
      "Invalid",
      350,
      "Cum Laude",
      "Computer Science",
      "Math",
      "University City",
      "STX",
      200,
      120,
      "AI Thesis",
      "Dr. Smith",
      ["Dr. A", "Dr. B"]
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_DEGREE_TYPE);
  });

  it("updates a diploma successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const hash = new Uint8Array(32).fill(7);
    contract.issueDiploma(
      1,
      1,
      1,
      hash,
      100,
      "Bachelor",
      350,
      "Cum Laude",
      "Computer Science",
      "Math",
      "University City",
      "STX",
      200,
      120,
      "AI Thesis",
      "Dr. Smith",
      ["Dr. A", "Dr. B"]
    );
    const result = contract.updateDiploma(0, 360, "Summa Cum Laude");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const diploma = contract.getDiploma(0);
    expect(diploma?.gpa).toBe(360);
    expect(diploma?.honors).toBe("Summa Cum Laude");
    const update = contract.state.diplomaUpdates.get(0);
    expect(update?.updateGpa).toBe(360);
    expect(update?.updateHonors).toBe("Summa Cum Laude");
    expect(update?.updater).toBe("ST1TEST");
  });

  it("rejects update for non-existent diploma", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.updateDiploma(99, 360, "Summa Cum Laude");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("rejects update by non-issuer", () => {
    contract.setAuthorityContract("ST2TEST");
    const hash = new Uint8Array(32).fill(8);
    contract.issueDiploma(
      1,
      1,
      1,
      hash,
      100,
      "Bachelor",
      350,
      "Cum Laude",
      "Computer Science",
      "Math",
      "University City",
      "STX",
      200,
      120,
      "AI Thesis",
      "Dr. Smith",
      ["Dr. A", "Dr. B"]
    );
    contract.caller = "ST3FAKE";
    const result = contract.updateDiploma(0, 360, "Summa Cum Laude");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("sets issuance fee successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.setIssuanceFee(200);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.issuanceFee).toBe(200);
    const hash = new Uint8Array(32).fill(9);
    contract.issueDiploma(
      1,
      1,
      1,
      hash,
      100,
      "Bachelor",
      350,
      "Cum Laude",
      "Computer Science",
      "Math",
      "University City",
      "STX",
      200,
      120,
      "AI Thesis",
      "Dr. Smith",
      ["Dr. A", "Dr. B"]
    );
    expect(contract.stxTransfers).toEqual([{ amount: 200, from: "ST1TEST", to: "ST2TEST" }]);
  });

  it("rejects issuance fee change without authority contract", () => {
    const result = contract.setIssuanceFee(200);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("returns correct diploma count", () => {
    contract.setAuthorityContract("ST2TEST");
    const hash1 = new Uint8Array(32).fill(10);
    contract.issueDiploma(
      1,
      1,
      1,
      hash1,
      100,
      "Bachelor",
      350,
      "Cum Laude",
      "Computer Science",
      "Math",
      "University City",
      "STX",
      200,
      120,
      "AI Thesis",
      "Dr. Smith",
      ["Dr. A", "Dr. B"]
    );
    const hash2 = new Uint8Array(32).fill(11);
    contract.issueDiploma(
      2,
      2,
      2,
      hash2,
      150,
      "Master",
      380,
      "Magna Cum Laude",
      "Engineering",
      "Physics",
      "Tech Town",
      "USD",
      250,
      60,
      "ML Thesis",
      "Dr. Johnson",
      ["Dr. C", "Dr. D"]
    );
    const result = contract.getDiplomaCount();
    expect(result.ok).toBe(true);
    expect(result.value).toBe(2);
  });

  it("checks diploma existence correctly", () => {
    contract.setAuthorityContract("ST2TEST");
    const hash = new Uint8Array(32).fill(12);
    contract.issueDiploma(
      1,
      1,
      1,
      hash,
      100,
      "Bachelor",
      350,
      "Cum Laude",
      "Computer Science",
      "Math",
      "University City",
      "STX",
      200,
      120,
      "AI Thesis",
      "Dr. Smith",
      ["Dr. A", "Dr. B"]
    );
    const result = contract.checkDiplomaExistence(hash);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const fakeHash = new Uint8Array(32).fill(13);
    const result2 = contract.checkDiplomaExistence(fakeHash);
    expect(result2.ok).toBe(true);
    expect(result2.value).toBe(false);
  });

  it("rejects diploma issuance with invalid hash length", () => {
    contract.setAuthorityContract("ST2TEST");
    const hash = new Uint8Array(31).fill(14);
    const result = contract.issueDiploma(
      1,
      1,
      1,
      hash,
      100,
      "Bachelor",
      350,
      "Cum Laude",
      "Computer Science",
      "Math",
      "University City",
      "STX",
      200,
      120,
      "AI Thesis",
      "Dr. Smith",
      ["Dr. A", "Dr. B"]
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_HASH);
  });

  it("rejects diploma issuance with max diplomas exceeded", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.state.maxDiplomas = 1;
    const hash1 = new Uint8Array(32).fill(15);
    contract.issueDiploma(
      1,
      1,
      1,
      hash1,
      100,
      "Bachelor",
      350,
      "Cum Laude",
      "Computer Science",
      "Math",
      "University City",
      "STX",
      200,
      120,
      "AI Thesis",
      "Dr. Smith",
      ["Dr. A", "Dr. B"]
    );
    const hash2 = new Uint8Array(32).fill(16);
    const result = contract.issueDiploma(
      2,
      2,
      2,
      hash2,
      150,
      "Master",
      380,
      "Magna Cum Laude",
      "Engineering",
      "Physics",
      "Tech Town",
      "USD",
      250,
      60,
      "ML Thesis",
      "Dr. Johnson",
      ["Dr. C", "Dr. D"]
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_MAX_DIPLOMAS_EXCEEDED);
  });

  it("sets authority contract successfully", () => {
    const result = contract.setAuthorityContract("ST2TEST");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.authorityContract).toBe("ST2TEST");
  });

  it("rejects invalid authority contract", () => {
    const result = contract.setAuthorityContract("SP000000000000000000002Q6VF78");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });
});