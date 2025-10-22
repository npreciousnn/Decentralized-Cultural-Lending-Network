(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-INVALID-ITEM-ID u101)
(define-constant ERR-INVALID-LENDER u102)
(define-constant ERR-INVALID-BORROWER u103)
(define-constant ERR-INVALID-DURATION u104)
(define-constant ERR-INVALID-FEE u105)
(define-constant ERR-INVALID-DEPOSIT u106)
(define-constant ERR-AGREEMENT-EXISTS u107)
(define-constant ERR-AGREEMENT-NOT-FOUND u108)
(define-constant ERR-INVALID-START-TIME u109)
(define-constant ERR-INVALID-STATUS u110)
(define-constant ERR-LOAN-EXPIRED u111)
(define-constant ERR-NOT-READY u112)
(define-constant ERR-ALREADY-RETURNED u113)
(define-constant ERR-DISPUTE-ACTIVE u114)
(define-constant ERR-INVALID-PENALTY u115)
(define-constant ERR-INSUFFICIENT-ESCROW u116)
(define-constant ERR-INVALID-INSURANCE u117)
(define-constant ERR-INVALID-REPUTATION u118)
(define-constant ERR-MAX-AGREEMENTS-EXCEEDED u119)
(define-constant ERR-INVALID-CURRENCY u120)
(define-constant ERR-INVALID-LOCATION u121)
(define-constant ERR-INVALID-CONDITION u122)
(define-constant ERR-INVALID-ORACLE u123)
(define-constant STATUS-PENDING u0)
(define-constant STATUS-ACTIVE u1)
(define-constant STATUS-RETURNED u2)
(define-constant STATUS-DISPUTED u3)
(define-constant STATUS-CLOSED u4)
(define-data-var next-agreement-id uint u0)
(define-data-var max-agreements uint u10000)
(define-data-var agreement-fee uint u500)
(define-data-var escrow-contract principal 'SP000000000000000000002Q6VF78)
(define-data-var item-registry-contract principal 'SP000000000000000000002Q6VF78)
(define-data-var user-registry-contract principal 'SP000000000000000000002Q6VF78)
(define-data-var dispute-resolver-contract principal 'SP000000000000000000002Q6VF78)
(define-data-var insurance-pool-contract principal 'SP000000000000000000002Q6VF78)
(define-map agreements
  uint
  {
    item-id: uint,
    lender: principal,
    borrower: principal,
    start-time: uint,
    duration: uint,
    rental-fee: uint,
    deposit: uint,
    penalty-rate: uint,
    status: uint,
    currency: (string-utf8 20),
    location: (string-utf8 100),
    condition-hash: (buff 32),
    insurance-amount: uint,
    reputation-threshold: uint
  }
)
(define-map agreement-updates
  uint
  {
    update-duration: uint,
    update-fee: uint,
    update-deposit: uint,
    update-timestamp: uint,
    updater: principal
  }
)
(define-read-only (get-agreement (id uint))
  (map-get? agreements id)
)
(define-read-only (get-agreement-update (id uint))
  (map-get? agreement-updates id)
)
(define-private (validate-item-id (item uint))
  (if (> item u0)
    (ok true)
    (err ERR-INVALID-ITEM-ID)
  )
)
(define-private (validate-principal (p principal))
  ;; ensure the provided principal matches the transaction sender
  (if (is-eq p tx-sender)
    (ok true)
    (err ERR-NOT-AUTHORIZED)
  )
)
(define-private (validate-duration (dur uint))
  (if (and (> dur u0) (<= dur u365))
    (ok true)
    (err ERR-INVALID-DURATION)
  )
)
(define-private (validate-fee (fee uint))
  (if (> fee u0)
    (ok true)
    (err ERR-INVALID-FEE)
  )
)
(define-private (validate-deposit (dep uint))
  (if (> dep u0)
    (ok true)
    (err ERR-INVALID-DEPOSIT)
  )
)
(define-private (validate-start-time (start uint))
  (if (>= start block-height)
    (ok true)
    (err ERR-INVALID-START-TIME)
  )
)
(define-private (validate-penalty-rate (rate uint))
  (if (<= rate u50)
    (ok true)
    (err ERR-INVALID-PENALTY)
  )
)
(define-private (validate-currency (cur (string-utf8 20)))
  (if (or (is-eq cur "STX") (is-eq cur "USD"))
    (ok true)
    (err ERR-INVALID-CURRENCY)
  )
)
(define-private (validate-location (loc (string-utf8 100)))
  (if (> (len loc) u0)
    (ok true)
    (err ERR-INVALID-LOCATION)
  )
)
(define-private (validate-condition-hash (hash (buff 32)))
  (if (is-eq (len hash) u32)
    (ok true)
    (err ERR-INVALID-CONDITION)
  )
)
(define-private (validate-insurance (ins uint))
  (if (>= ins u0)
    (ok true)
    (err ERR-INVALID-INSURANCE)
  )
)
(define-private (validate-reputation (rep uint))
  (if (>= rep u50)
    (ok true)
    (err ERR-INVALID-REPUTATION)
  )
)
(define-public (set-max-agreements (new-max uint))
  (begin
    (asserts! (is-eq tx-sender (as-contract tx-sender)) (err ERR-NOT-AUTHORIZED))
    (var-set max-agreements new-max)
    (ok true)
  )
)
(define-public (set-agreement-fee (new-fee uint))
  (begin
    (asserts! (is-eq tx-sender (as-contract tx-sender)) (err ERR-NOT-AUTHORIZED))
    (var-set agreement-fee new-fee)
    (ok true)
  )
)
(define-public (create-agreement
  (item-id uint)
  (lender principal)
  (borrower principal)
  (start-time uint)
  (duration uint)
  (rental-fee uint)
  (deposit uint)
  (penalty-rate uint)
  (currency (string-utf8 20))
  (location (string-utf8 100))
  (condition-hash (buff 32))
  (insurance-amount uint)
  (reputation-threshold uint)
)
  (let
    (
      (next-id (var-get next-agreement-id))
      (current-max (var-get max-agreements))
    )
    (asserts! (< next-id current-max) (err ERR-MAX-AGREEMENTS-EXCEEDED))
    (try! (validate-item-id item-id))
    (try! (validate-principal lender))
    (try! (validate-principal borrower))
    (try! (validate-start-time start-time))
    (try! (validate-duration duration))
    (try! (validate-fee rental-fee))
    (try! (validate-deposit deposit))
    (try! (validate-penalty-rate penalty-rate))
    (try! (validate-currency currency))
    (try! (validate-location location))
    (try! (validate-condition-hash condition-hash))
    (try! (validate-insurance insurance-amount))
    (try! (validate-reputation reputation-threshold))
    (asserts! (is-eq tx-sender borrower) (err ERR-NOT-AUTHORIZED))
    (try! (stx-transfer? (var-get agreement-fee) tx-sender (var-get escrow-contract)))
    (map-set agreements next-id
      {
        item-id: item-id,
        lender: lender,
        borrower: borrower,
        start-time: start-time,
        duration: duration,
        rental-fee: rental-fee,
        deposit: deposit,
        penalty-rate: penalty-rate,
        status: STATUS-PENDING,
        currency: currency,
        location: location,
        condition-hash: condition-hash,
        insurance-amount: insurance-amount,
        reputation-threshold: reputation-threshold
      }
    )
    (var-set next-agreement-id (+ next-id u1))
    (print { event: "agreement-created", id: next-id })
    (ok next-id)
  )
)
(define-public (activate-agreement (id uint))
  (let ((agreement (unwrap! (map-get? agreements id) (err ERR-AGREEMENT-NOT-FOUND))))
    (asserts! (is-eq (get status agreement) STATUS-PENDING) (err ERR-INVALID-STATUS))
    (asserts! (is-eq tx-sender (get lender agreement)) (err ERR-NOT-AUTHORIZED))
    (asserts! (>= block-height (get start-time agreement)) (err ERR-NOT-READY))
    (map-set agreements id (merge agreement { status: STATUS-ACTIVE }))
    (print { event: "agreement-activated", id: id })
    (ok true)
  )
)
(define-public (return-item (id uint) (return-hash (buff 32)))
  (let ((agreement (unwrap! (map-get? agreements id) (err ERR-AGREEMENT-NOT-FOUND))))
    (asserts! (is-eq (get status agreement) STATUS-ACTIVE) (err ERR-INVALID-STATUS))
    (asserts! (is-eq tx-sender (get borrower agreement)) (err ERR-NOT-AUTHORIZED))
    (asserts! (is-eq return-hash (get condition-hash agreement)) (err ERR-INVALID-CONDITION))
    (let ((end-time (+ (get start-time agreement) (get duration agreement))))
      (if (> block-height end-time)
        (let ((delay (- block-height end-time))
              (penalty (* delay (get penalty-rate agreement))))
          (try! (stx-transfer? penalty tx-sender (get lender agreement)))
        )
        (ok true)
      )
    )
    (map-set agreements id (merge agreement { status: STATUS-RETURNED }))
    (try! (stx-transfer? (get deposit agreement) (var-get escrow-contract) tx-sender))
    (print { event: "item-returned", id: id })
    (ok true)
  )
)
(define-public (initiate-dispute (id uint) (evidence (buff 256)))
  (let ((agreement (unwrap! (map-get? agreements id) (err ERR-AGREEMENT-NOT-FOUND))))
    (asserts! (or (is-eq tx-sender (get lender agreement)) (is-eq tx-sender (get borrower agreement))) (err ERR-NOT-AUTHORIZED))
    (asserts! (is-eq (get status agreement) STATUS-ACTIVE) (err ERR-INVALID-STATUS))
    (map-set agreements id (merge agreement { status: STATUS-DISPUTED }))
    (print { event: "dispute-initiated", id: id, evidence: evidence })
    (ok true)
  )
)
(define-public (resolve-dispute (id uint) (winner principal))
  (let ((agreement (unwrap! (map-get? agreements id) (err ERR-AGREEMENT-NOT-FOUND))))
    (asserts! (is-eq tx-sender (var-get dispute-resolver-contract)) (err ERR-NOT-AUTHORIZED))
    (asserts! (is-eq (get status agreement) STATUS-DISPUTED) (err ERR-INVALID-STATUS))
    (if (is-eq winner (get lender agreement))
      (try! (stx-transfer? (get deposit agreement) (var-get escrow-contract) (get lender agreement)))
      (try! (stx-transfer? (get deposit agreement) (var-get escrow-contract) (get borrower agreement)))
    )
    (map-set agreements id (merge agreement { status: STATUS-CLOSED }))
    (print { event: "dispute-resolved", id: id, winner: winner })
    (ok true)
  )
)
(define-public (update-agreement (id uint) (new-duration uint) (new-fee uint) (new-deposit uint))
  (let ((agreement (unwrap! (map-get? agreements id) (err ERR-AGREEMENT-NOT-FOUND))))
    (asserts! (is-eq tx-sender (get lender agreement)) (err ERR-NOT-AUTHORIZED))
    (asserts! (is-eq (get status agreement) STATUS-PENDING) (err ERR-INVALID-STATUS))
    (try! (validate-duration new-duration))
    (try! (validate-fee new-fee))
    (try! (validate-deposit new-deposit))
    (map-set agreements id
      (merge agreement
        {
          duration: new-duration,
          rental-fee: new-fee,
          deposit: new-deposit
        }
      )
    )
    (map-set agreement-updates id
      {
        update-duration: new-duration,
        update-fee: new-fee,
        update-deposit: new-deposit,
        update-timestamp: block-height,
        updater: tx-sender
      }
    )
    (print { event: "agreement-updated", id: id })
    (ok true)
  )
)
(define-public (get-agreement-count)
  (ok (var-get next-agreement-id))
)