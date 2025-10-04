(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-INVALID-INSTITUTION u101)
(define-constant ERR-INVALID-STUDENT u102)
(define-constant ERR-INVALID-TEMPLATE u103)
(define-constant ERR-INVALID-HASH u104)
(define-constant ERR-INVALID-ISSUANCE-DATE u105)
(define-constant ERR-DIPLOMA-ALREADY-ISSUED u106)
(define-constant ERR-DIPLOMA-NOT-FOUND u107)
(define-constant ERR-INVALID-TIMESTAMP u108)
(define-constant ERR-INSTITUTION-NOT-VERIFIED u109)
(define-constant ERR-INVALID-GPA u110)
(define-constant ERR-INVALID-DEGREE-TYPE u111)
(define-constant ERR-ISSUANCE-NOT-ALLOWED u112)
(define-constant ERR-INVALID-UPDATE-PARAM u113)
(define-constant ERR-MAX-DIPLOMAS-EXCEEDED u114)
(define-constant ERR-INVALID-HONORS u115)
(define-constant ERR-INVALID-MAJOR u116)
(define-constant ERR-INVALID-MINOR u117)
(define-constant ERR-INVALID-LOCATION u118)
(define-constant ERR-INVALID-CURRENCY u119)
(define-constant ERR-INVALID-STATUS u120)
(define-constant ERR-INVALID-EXPIRY u121)
(define-constant ERR-INVALID-CREDITS u122)
(define-constant ERR-INVALID-THESIS u123)
(define-constant ERR-INVALID-ADVISOR u124)
(define-constant ERR-INVALID-COMMITTEE u125)

(define-data-var next-diploma-id uint u0)
(define-data-var max-diplomas uint u1000000)
(define-data-var issuance-fee uint u100)
(define-data-var authority-contract (optional principal) none)

(define-map diplomas
  uint
  {
    institution-id: uint,
    student-id: uint,
    template-id: uint,
    content-hash: (buff 32),
    issuance-date: uint,
    timestamp: uint,
    issuer: principal,
    degree-type: (string-utf8 50),
    gpa: uint,
    honors: (string-utf8 50),
    major: (string-utf8 100),
    minor: (string-utf8 100),
    location: (string-utf8 100),
    currency: (string-utf8 20),
    status: bool,
    expiry: uint,
    credits: uint,
    thesis-title: (string-utf8 200),
    advisor: (string-utf8 100),
    committee: (list 5 (string-utf8 100))
  }
)

(define-map diplomas-by-hash
  (buff 32)
  uint)

(define-map diploma-updates
  uint
  {
    update-gpa: uint,
    update-honors: (string-utf8 50),
    update-timestamp: uint,
    updater: principal
  }
)

(define-read-only (get-diploma (id uint))
  (map-get? diplomas id)
)

(define-read-only (get-diploma-updates (id uint))
  (map-get? diploma-updates id)
)

(define-read-only (is-diploma-issued (hash (buff 32)))
  (is-some (map-get? diplomas-by-hash hash))
)

(define-private (validate-institution (id uint))
  (if (> id u0)
      (ok true)
      (err ERR-INVALID-INSTITUTION))
)

(define-private (validate-student (id uint))
  (if (> id u0)
      (ok true)
      (err ERR-INVALID-STUDENT))
)

(define-private (validate-template (id uint))
  (if (> id u0)
      (ok true)
      (err ERR-INVALID-TEMPLATE))
)

(define-private (validate-hash (hash (buff 32)))
  (if (is-eq (len hash) u32)
      (ok true)
      (err ERR-INVALID-HASH))
)

(define-private (validate-issuance-date (date uint))
  (if (>= date block-height)
      (ok true)
      (err ERR-INVALID-ISSUANCE-DATE))
)

(define-private (validate-timestamp (ts uint))
  (if (>= ts block-height)
      (ok true)
      (err ERR-INVALID-TIMESTAMP))
)

(define-private (validate-degree-type (type (string-utf8 50)))
  (if (or (is-eq type "Bachelor") (is-eq type "Master") (is-eq type "PhD"))
      (ok true)
      (err ERR-INVALID-DEGREE-TYPE))
)

(define-private (validate-gpa (gpa uint))
  (if (and (>= gpa u0) (<= gpa u400))
      (ok true)
      (err ERR-INVALID-GPA))
)

(define-private (validate-honors (honors (string-utf8 50)))
  (if (<= (len honors) u50)
      (ok true)
      (err ERR-INVALID-HONORS))
)

(define-private (validate-major (major (string-utf8 100)))
  (if (and (> (len major) u0) (<= (len major) u100))
      (ok true)
      (err ERR-INVALID-MAJOR))
)

(define-private (validate-minor (minor (string-utf8 100)))
  (if (<= (len minor) u100)
      (ok true)
      (err ERR-INVALID-MINOR))
)

(define-private (validate-location (loc (string-utf8 100)))
  (if (and (> (len loc) u0) (<= (len loc) u100))
      (ok true)
      (err ERR-INVALID-LOCATION))
)

(define-private (validate-currency (cur (string-utf8 20)))
  (if (or (is-eq cur "STX") (is-eq cur "USD") (is-eq cur "BTC"))
      (ok true)
      (err ERR-INVALID-CURRENCY))
)

(define-private (validate-expiry (exp uint))
  (if (>= exp block-height)
      (ok true)
      (err ERR-INVALID-EXPIRY))
)

(define-private (validate-credits (credits uint))
  (if (> credits u0)
      (ok true)
      (err ERR-INVALID-CREDITS))
)

(define-private (validate-thesis (thesis (string-utf8 200)))
  (if (<= (len thesis) u200)
      (ok true)
      (err ERR-INVALID-THESIS))
)

(define-private (validate-advisor (advisor (string-utf8 100)))
  (if (<= (len advisor) u100)
      (ok true)
      (err ERR-INVALID-ADVISOR))
)

(define-private (validate-committee (committee (list 5 (string-utf8 100))))
  (if (<= (len committee) u5)
      (ok true)
      (err ERR-INVALID-COMMITTEE))
)

(define-private (validate-principal (p principal))
  (if (not (is-eq p 'SP000000000000000000002Q6VF78))
      (ok true)
      (err ERR-NOT-AUTHORIZED))
)

(define-public (set-authority-contract (contract-principal principal))
  (begin
    (try! (validate-principal contract-principal))
    (asserts! (is-none (var-get authority-contract)) (err ERR-INSTITUTION-NOT-VERIFIED))
    (var-set authority-contract (some contract-principal))
    (ok true)
  )
)

(define-public (set-max-diplomas (new-max uint))
  (begin
    (asserts! (> new-max u0) (err ERR-MAX-DIPLOMAS-EXCEEDED))
    (asserts! (is-some (var-get authority-contract)) (err ERR-INSTITUTION-NOT-VERIFIED))
    (var-set max-diplomas new-max)
    (ok true)
  )
)

(define-public (set-issuance-fee (new-fee uint))
  (begin
    (asserts! (>= new-fee u0) (err ERR-INVALID-UPDATE-PARAM))
    (asserts! (is-some (var-get authority-contract)) (err ERR-INSTITUTION-NOT-VERIFIED))
    (var-set issuance-fee new-fee)
    (ok true)
  )
)

(define-public (issue-diploma
  (institution-id uint)
  (student-id uint)
  (template-id uint)
  (content-hash (buff 32))
  (issuance-date uint)
  (degree-type (string-utf8 50))
  (gpa uint)
  (honors (string-utf8 50))
  (major (string-utf8 100))
  (minor (string-utf8 100))
  (location (string-utf8 100))
  (currency (string-utf8 20))
  (expiry uint)
  (credits uint)
  (thesis-title (string-utf8 200))
  (advisor (string-utf8 100))
  (committee (list 5 (string-utf8 100)))
)
  (let (
        (next-id (var-get next-diploma-id))
        (current-max (var-get max-diplomas))
        (authority (var-get authority-contract))
      )
    (asserts! (< next-id current-max) (err ERR-MAX-DIPLOMAS-EXCEEDED))
    (try! (validate-institution institution-id))
    (try! (validate-student student-id))
    (try! (validate-template template-id))
    (try! (validate-hash content-hash))
    (try! (validate-issuance-date issuance-date))
    (try! (validate-degree-type degree-type))
    (try! (validate-gpa gpa))
    (try! (validate-honors honors))
    (try! (validate-major major))
    (try! (validate-minor minor))
    (try! (validate-location location))
    (try! (validate-currency currency))
    (try! (validate-expiry expiry))
    (try! (validate-credits credits))
    (try! (validate-thesis thesis-title))
    (try! (validate-advisor advisor))
    (try! (validate-committee committee))
    (asserts! (is-none (map-get? diplomas-by-hash content-hash)) (err ERR-DIPLOMA-ALREADY-ISSUED))
    (let ((authority-recipient (unwrap! authority (err ERR-INSTITUTION-NOT-VERIFIED))))
      (try! (stx-transfer? (var-get issuance-fee) tx-sender authority-recipient))
    )
    (map-set diplomas next-id
      {
        institution-id: institution-id,
        student-id: student-id,
        template-id: template-id,
        content-hash: content-hash,
        issuance-date: issuance-date,
        timestamp: block-height,
        issuer: tx-sender,
        degree-type: degree-type,
        gpa: gpa,
        honors: honors,
        major: major,
        minor: minor,
        location: location,
        currency: currency,
        status: true,
        expiry: expiry,
        credits: credits,
        thesis-title: thesis-title,
        advisor: advisor,
        committee: committee
      }
    )
    (map-set diplomas-by-hash content-hash next-id)
    (var-set next-diploma-id (+ next-id u1))
    (print { event: "diploma-issued", id: next-id })
    (ok next-id)
  )
)

(define-public (update-diploma
  (diploma-id uint)
  (update-gpa uint)
  (update-honors (string-utf8 50))
)
  (let ((diploma (map-get? diplomas diploma-id)))
    (match diploma
      d
        (begin
          (asserts! (is-eq (get issuer d) tx-sender) (err ERR-NOT-AUTHORIZED))
          (try! (validate-gpa update-gpa))
          (try! (validate-honors update-honors))
          (map-set diplomas diploma-id
            {
              institution-id: (get institution-id d),
              student-id: (get student-id d),
              template-id: (get template-id d),
              content-hash: (get content-hash d),
              issuance-date: (get issuance-date d),
              timestamp: block-height,
              issuer: (get issuer d),
              degree-type: (get degree-type d),
              gpa: update-gpa,
              honors: update-honors,
              major: (get major d),
              minor: (get minor d),
              location: (get location d),
              currency: (get currency d),
              status: (get status d),
              expiry: (get expiry d),
              credits: (get credits d),
              thesis-title: (get thesis-title d),
              advisor: (get advisor d),
              committee: (get committee d)
            }
          )
          (map-set diploma-updates diploma-id
            {
              update-gpa: update-gpa,
              update-honors: update-honors,
              update-timestamp: block-height,
              updater: tx-sender
            }
          )
          (print { event: "diploma-updated", id: diploma-id })
          (ok true)
        )
      (err ERR-DIPLOMA-NOT-FOUND)
    )
  )
)

(define-public (get-diploma-count)
  (ok (var-get next-diploma-id))
)

(define-public (check-diploma-existence (hash (buff 32)))
  (ok (is-diploma-issued hash))
)