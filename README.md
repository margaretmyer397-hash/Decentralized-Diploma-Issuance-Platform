# 📜 Decentralized Diploma Issuance Platform

Welcome to a revolutionary platform for issuing and verifying educational diplomas on the blockchain! This Web3 project addresses the real-world problem of diploma fraud, slow verification processes, and reliance on centralized third parties like universities or notaries. By leveraging the Stacks blockchain and Clarity smart contracts, educational institutions can issue tamper-proof diplomas that anyone can verify instantly and globally, without intermediaries. Students own their credentials as non-fungible assets, ensuring portability and privacy.

## ✨ Features

🔒 Tamper-proof diploma issuance tied to blockchain timestamps  
🌍 Instant global verification by anyone, anywhere  
🏫 Institution registration and authentication to prevent fake issuers  
🎓 Student-controlled ownership with optional revocation mechanisms  
📊 Metadata storage for diploma details (e.g., grades, courses)  
🚫 Anti-fraud measures like unique hashes and revocation lists  
🔐 Permissioned access for sensitive data  
📈 Scalable design with modular smart contracts for easy upgrades  

## 🛠 How It Works

This platform uses 7 interconnected Clarity smart contracts to create a secure, decentralized ecosystem. Institutions register themselves, define diploma templates, and issue credentials to verified students. Verifiers can query the blockchain to confirm authenticity without contacting the issuer. All data is hashed and stored immutably, ensuring integrity.

### Smart Contracts Overview

1. **InstitutionRegistry.clar**: Manages registration of educational institutions. Institutions submit proof (e.g., domain hash) and get approved by admins or via DAO voting. Stores institution IDs, names, and verification status.

2. **StudentRegistry.clar**: Handles student identity registration. Students create profiles with unique identifiers (e.g., hashed personal info) to receive diplomas. Prevents duplicate identities and links to wallets.

3. **DiplomaTemplate.clar**: Allows institutions to define customizable diploma templates, including fields like degree type, issuance date, GPA, and custom metadata. Templates are stored as reusable schemas.

4. **DiplomaIssuance.clar**: Core contract for issuing diplomas. Institutions call this to mint a diploma NFT-like token for a student, referencing a template and adding a unique hash of the diploma content. Emits events for tracking.

5. **DiplomaVerification.clar**: Public query contract for verification. Anyone can input a diploma ID or hash to check ownership, issuance details, and validity (e.g., not revoked). Returns boolean results and metadata.

6. **RevocationList.clar**: Enables institutions to revoke diplomas in cases of error or fraud. Maintains a list of revoked IDs with reasons, ensuring revoked diplomas fail verification checks.

7. **MetadataStorage.clar**: Secure storage for off-chain linked metadata (e.g., IPFS hashes for full transcripts). Uses maps to associate data with diploma IDs, with access controls for privacy.

**For Institutions**

- Register your institution via `InstitutionRegistry.clar` (e.g., call `register-institution` with name, proof-hash).
- Create a template in `DiplomaTemplate.clar` (e.g., `define-template` with fields like title, date, GPA).
- Issue a diploma using `DiplomaIssuance.clar` (e.g., `issue-diploma` with student-ID, template-ID, content-hash).

Your diploma is now live on the blockchain—immutable and verifiable!

**For Students**

- Register your profile in `StudentRegistry.clar` (e.g., `register-student` with wallet and identity-hash).
- Receive your diploma token, which you can store in your wallet.
- Share your diploma ID for verification.

**For Verifiers (e.g., Employers)**

- Use `DiplomaVerification.clar` to call `verify-diploma` with the diploma-ID or hash.
- Check revocation status via `RevocationList.clar` (e.g., `is-revoked`).
- Retrieve details from `MetadataStorage.clar` if permitted.

Instant, trustless verification—no emails or calls needed!

