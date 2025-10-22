import { describe, it, expect, beforeEach } from "vitest";

const ERR_NOT_AUTHORIZED = 100;
const ERR_INVALID_ITEM_ID = 101;
const ERR_INVALID_LENDER = 102;
const ERR_INVALID_BORROWER = 103;
const ERR_INVALID_DURATION = 104;
const ERR_INVALID_FEE = 105;
const ERR_INVALID_DEPOSIT = 106;
const ERR_AGREEMENT_EXISTS = 107;
const ERR_AGREEMENT_NOT_FOUND = 108;
const ERR_INVALID_START_TIME = 109;
const ERR_INVALID_STATUS = 110;
const ERR_LOAN_EXPIRED = 111;
const ERR_NOT_READY = 112;
const ERR_ALREADY_RETURNED = 113;
const ERR_DISPUTE_ACTIVE = 114;
const ERR_INVALID_PENALTY = 115;
const ERR_INSUFFICIENT_ESCROW = 116;
const ERR_INVALID_INSURANCE = 117;
const ERR_INVALID_REPUTATION = 118;
const ERR_MAX_AGREEMENTS_EXCEEDED = 119;
const ERR_INVALID_CURRENCY = 120;
const ERR_INVALID_LOCATION = 121;
const ERR_INVALID_CONDITION = 122;
const ERR_INVALID_ORACLE = 123;

const STATUS_PENDING = 0;
const STATUS_ACTIVE = 1;
const STATUS_RETURNED = 2;
const STATUS_DISPUTED = 3;
const STATUS_CLOSED = 4;

interface Agreement {
  itemId: number;
  lender: string;
  borrower: string;
  startTime: number;
  duration: number;
  rentalFee: number;
  deposit: number;
  penaltyRate: number;
  status: number;
  currency: string;
  location: string;
  conditionHash: Uint8Array;
  insuranceAmount: number;
  reputationThreshold: number;
}

interface AgreementUpdate {
  updateDuration: number;
  updateFee: number;
  updateDeposit: number;
  updateTimestamp: number;
  updater: string;
}

interface Result<T> {
  ok: boolean;
  value: T;
}

class LoanAgreementMock {
  state: {
    nextAgreementId: number;
    maxAgreements: number;
    agreementFee: number;
    escrowContract: string;
    itemRegistryContract: string;
    userRegistryContract: string;
    disputeResolverContract: string;
    insurancePoolContract: string;
    agreements: Map<number, Agreement>;
    agreementUpdates: Map<number, AgreementUpdate>;
  } = {
    nextAgreementId: 0,
    maxAgreements: 10000,
    agreementFee: 500,
    escrowContract: "SP000000000000000000002Q6VF78",
    itemRegistryContract: "SP000000000000000000002Q6VF78",
    userRegistryContract: "SP000000000000000000002Q6VF78",
    disputeResolverContract: "SP000000000000000000002Q6VF78",
    insurancePoolContract: "SP000000000000000000002Q6VF78",
    agreements: new Map(),
    agreementUpdates: new Map(),
  };
  blockHeight: number = 0;
  caller: string = "ST1LENDER";
  stxTransfers: Array<{ amount: number; from: string; to: string }> = [];

  constructor() {
    this.reset();
  }

  reset() {
    this.state = {
      nextAgreementId: 0,
      maxAgreements: 10000,
      agreementFee: 500,
      escrowContract: "SP000000000000000000002Q6VF78",
      itemRegistryContract: "SP000000000000000000002Q6VF78",
      userRegistryContract: "SP000000000000000000002Q6VF78",
      disputeResolverContract: "SP000000000000000000002Q6VF78",
      insurancePoolContract: "SP000000000000000000002Q6VF78",
      agreements: new Map(),
      agreementUpdates: new Map(),
    };
    this.blockHeight = 0;
    this.caller = "ST1LENDER";
    this.stxTransfers = [];
  }

  createAgreement(
    itemId: number,
    lender: string,
    borrower: string,
    startTime: number,
    duration: number,
    rentalFee: number,
    deposit: number,
    penaltyRate: number,
    currency: string,
    location: string,
    conditionHash: Uint8Array,
    insuranceAmount: number,
    reputationThreshold: number
  ): Result<number> {
    if (this.state.nextAgreementId >= this.state.maxAgreements) return { ok: false, value: ERR_MAX_AGREEMENTS_EXCEEDED };
    if (itemId <= 0) return { ok: false, value: ERR_INVALID_ITEM_ID };
  // ensure lender/borrower are provided (non-empty strings)
  if (!lender || lender.length === 0) return { ok: false, value: ERR_INVALID_LENDER };
  if (!borrower || borrower.length === 0) return { ok: false, value: ERR_INVALID_BORROWER };
    if (startTime < this.blockHeight) return { ok: false, value: ERR_INVALID_START_TIME };
    if (duration <= 0 || duration > 365) return { ok: false, value: ERR_INVALID_DURATION };
    if (rentalFee <= 0) return { ok: false, value: ERR_INVALID_FEE };
    if (deposit <= 0) return { ok: false, value: ERR_INVALID_DEPOSIT };
    if (penaltyRate > 50) return { ok: false, value: ERR_INVALID_PENALTY };
    if (!["STX", "USD"].includes(currency)) return { ok: false, value: ERR_INVALID_CURRENCY };
    if (location.length === 0) return { ok: false, value: ERR_INVALID_LOCATION };
    if (conditionHash.length !== 32) return { ok: false, value: ERR_INVALID_CONDITION };
    if (insuranceAmount < 0) return { ok: false, value: ERR_INVALID_INSURANCE };
    if (reputationThreshold < 50) return { ok: false, value: ERR_INVALID_REPUTATION };
    if (this.caller !== borrower) return { ok: false, value: ERR_NOT_AUTHORIZED };
    this.stxTransfers.push({ amount: this.state.agreementFee, from: this.caller, to: this.state.escrowContract });
    const id = this.state.nextAgreementId;
    const agreement: Agreement = {
      itemId,
      lender,
      borrower,
      startTime,
      duration,
      rentalFee,
      deposit,
      penaltyRate,
      status: STATUS_PENDING,
      currency,
      location,
      conditionHash,
      insuranceAmount,
      reputationThreshold,
    };
    this.state.agreements.set(id, agreement);
    this.state.nextAgreementId++;
    return { ok: true, value: id };
  }

  activateAgreement(id: number): Result<boolean> {
    const agreement = this.state.agreements.get(id);
    if (!agreement) return { ok: false, value: ERR_AGREEMENT_NOT_FOUND };
    if (agreement.status !== STATUS_PENDING) return { ok: false, value: ERR_INVALID_STATUS };
    if (this.caller !== agreement.lender) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (this.blockHeight < agreement.startTime) return { ok: false, value: ERR_NOT_READY };
    this.state.agreements.set(id, { ...agreement, status: STATUS_ACTIVE });
    return { ok: true, value: true };
  }

  returnItem(id: number, returnHash: Uint8Array): Result<boolean> {
    const agreement = this.state.agreements.get(id);
    if (!agreement) return { ok: false, value: ERR_AGREEMENT_NOT_FOUND };
    if (agreement.status !== STATUS_ACTIVE) return { ok: false, value: ERR_INVALID_STATUS };
    if (this.caller !== agreement.borrower) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (!this.buffersEqual(returnHash, agreement.conditionHash)) return { ok: false, value: ERR_INVALID_CONDITION };
    const endTime = agreement.startTime + agreement.duration;
    if (this.blockHeight > endTime) {
      const delay = this.blockHeight - endTime;
      const penalty = delay * agreement.penaltyRate;
      this.stxTransfers.push({ amount: penalty, from: this.caller, to: agreement.lender });
    }
    this.state.agreements.set(id, { ...agreement, status: STATUS_RETURNED });
    this.stxTransfers.push({ amount: agreement.deposit, from: this.state.escrowContract, to: this.caller });
    return { ok: true, value: true };
  }

  initiateDispute(id: number, evidence: Uint8Array): Result<boolean> {
    const agreement = this.state.agreements.get(id);
    if (!agreement) return { ok: false, value: ERR_AGREEMENT_NOT_FOUND };
    if (this.caller !== agreement.lender && this.caller !== agreement.borrower) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (agreement.status !== STATUS_ACTIVE) return { ok: false, value: ERR_INVALID_STATUS };
    this.state.agreements.set(id, { ...agreement, status: STATUS_DISPUTED });
    return { ok: true, value: true };
  }

  resolveDispute(id: number, winner: string): Result<boolean> {
    const agreement = this.state.agreements.get(id);
    if (!agreement) return { ok: false, value: ERR_AGREEMENT_NOT_FOUND };
    if (this.caller !== this.state.disputeResolverContract) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (agreement.status !== STATUS_DISPUTED) return { ok: false, value: ERR_INVALID_STATUS };
    const recipient = winner === agreement.lender ? agreement.lender : agreement.borrower;
    this.stxTransfers.push({ amount: agreement.deposit, from: this.state.escrowContract, to: recipient });
    this.state.agreements.set(id, { ...agreement, status: STATUS_CLOSED });
    return { ok: true, value: true };
  }

  updateAgreement(id: number, newDuration: number, newFee: number, newDeposit: number): Result<boolean> {
    const agreement = this.state.agreements.get(id);
    if (!agreement) return { ok: false, value: ERR_AGREEMENT_NOT_FOUND };
    if (this.caller !== agreement.lender) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (agreement.status !== STATUS_PENDING) return { ok: false, value: ERR_INVALID_STATUS };
    if (newDuration <= 0 || newDuration > 365) return { ok: false, value: ERR_INVALID_DURATION };
    if (newFee <= 0) return { ok: false, value: ERR_INVALID_FEE };
    if (newDeposit <= 0) return { ok: false, value: ERR_INVALID_DEPOSIT };
    this.state.agreements.set(id, { ...agreement, duration: newDuration, rentalFee: newFee, deposit: newDeposit });
    this.state.agreementUpdates.set(id, {
      updateDuration: newDuration,
      updateFee: newFee,
      updateDeposit: newDeposit,
      updateTimestamp: this.blockHeight,
      updater: this.caller,
    });
    return { ok: true, value: true };
  }

  getAgreementCount(): Result<number> {
    return { ok: true, value: this.state.nextAgreementId };
  }

  private buffersEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }
}

describe("LoanAgreement", () => {
  let contract: LoanAgreementMock;

  beforeEach(() => {
    contract = new LoanAgreementMock();
    contract.reset();
  });

  it("creates an agreement successfully", () => {
    contract.caller = "ST2BORROWER";
    const conditionHash = new Uint8Array(32).fill(1);
    const result = contract.createAgreement(
      1,
      "ST1LENDER",
      "ST2BORROWER",
      10,
      30,
      100,
      500,
      5,
      "STX",
      "MuseumA",
      conditionHash,
      200,
      60
    );
    expect(result.ok).toBe(true);
    expect(result.value).toBe(0);
    const agreement = contract.state.agreements.get(0);
    expect(agreement?.itemId).toBe(1);
    expect(agreement?.lender).toBe("ST1LENDER");
    expect(agreement?.borrower).toBe("ST2BORROWER");
    expect(agreement?.startTime).toBe(10);
    expect(agreement?.duration).toBe(30);
    expect(agreement?.rentalFee).toBe(100);
    expect(agreement?.deposit).toBe(500);
    expect(agreement?.penaltyRate).toBe(5);
    expect(agreement?.status).toBe(STATUS_PENDING);
    expect(agreement?.currency).toBe("STX");
    expect(agreement?.location).toBe("MuseumA");
    expect(agreement?.insuranceAmount).toBe(200);
    expect(agreement?.reputationThreshold).toBe(60);
    expect(contract.stxTransfers).toEqual([{ amount: 500, from: "ST2BORROWER", to: "SP000000000000000000002Q6VF78" }]);
  });

  it("rejects creation with invalid duration", () => {
    contract.caller = "ST2BORROWER";
    const conditionHash = new Uint8Array(32).fill(1);
    const result = contract.createAgreement(
      1,
      "ST1LENDER",
      "ST2BORROWER",
      10,
      400,
      100,
      500,
      5,
      "STX",
      "MuseumA",
      conditionHash,
      200,
      60
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_DURATION);
  });

  it("activates agreement successfully", () => {
    contract.caller = "ST2BORROWER";
    const conditionHash = new Uint8Array(32).fill(1);
    contract.createAgreement(
      1,
      "ST1LENDER",
      "ST2BORROWER",
      10,
      30,
      100,
      500,
      5,
      "STX",
      "MuseumA",
      conditionHash,
      200,
      60
    );
    contract.caller = "ST1LENDER";
    contract.blockHeight = 15;
    const result = contract.activateAgreement(0);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const agreement = contract.state.agreements.get(0);
    expect(agreement?.status).toBe(STATUS_ACTIVE);
  });

  it("rejects activation before start time", () => {
    contract.caller = "ST2BORROWER";
    const conditionHash = new Uint8Array(32).fill(1);
    contract.createAgreement(
      1,
      "ST1LENDER",
      "ST2BORROWER",
      10,
      30,
      100,
      500,
      5,
      "STX",
      "MuseumA",
      conditionHash,
      200,
      60
    );
    contract.caller = "ST1LENDER";
    contract.blockHeight = 5;
    const result = contract.activateAgreement(0);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_NOT_READY);
  });

  it("returns item successfully without penalty", () => {
    contract.caller = "ST2BORROWER";
    const conditionHash = new Uint8Array(32).fill(1);
    contract.createAgreement(
      1,
      "ST1LENDER",
      "ST2BORROWER",
      10,
      30,
      100,
      500,
      5,
      "STX",
      "MuseumA",
      conditionHash,
      200,
      60
    );
    contract.caller = "ST1LENDER";
    contract.blockHeight = 15;
    contract.activateAgreement(0);
    contract.caller = "ST2BORROWER";
    contract.blockHeight = 35;
    const result = contract.returnItem(0, conditionHash);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const agreement = contract.state.agreements.get(0);
    expect(agreement?.status).toBe(STATUS_RETURNED);
    expect(contract.stxTransfers[contract.stxTransfers.length - 1]).toEqual({ amount: 500, from: "SP000000000000000000002Q6VF78", to: "ST2BORROWER" });
  });

  it("returns item with penalty", () => {
    contract.caller = "ST2BORROWER";
    const conditionHash = new Uint8Array(32).fill(1);
    contract.createAgreement(
      1,
      "ST1LENDER",
      "ST2BORROWER",
      10,
      30,
      100,
      500,
      5,
      "STX",
      "MuseumA",
      conditionHash,
      200,
      60
    );
    contract.caller = "ST1LENDER";
    contract.blockHeight = 15;
    contract.activateAgreement(0);
    contract.caller = "ST2BORROWER";
    contract.blockHeight = 45;
    const result = contract.returnItem(0, conditionHash);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.stxTransfers[contract.stxTransfers.length - 2]).toEqual({ amount: 25, from: "ST2BORROWER", to: "ST1LENDER" });
    expect(contract.stxTransfers[contract.stxTransfers.length - 1]).toEqual({ amount: 500, from: "SP000000000000000000002Q6VF78", to: "ST2BORROWER" });
  });

  it("initiates dispute successfully", () => {
    contract.caller = "ST2BORROWER";
    const conditionHash = new Uint8Array(32).fill(1);
    contract.createAgreement(
      1,
      "ST1LENDER",
      "ST2BORROWER",
      10,
      30,
      100,
      500,
      5,
      "STX",
      "MuseumA",
      conditionHash,
      200,
      60
    );
    contract.caller = "ST1LENDER";
    contract.blockHeight = 15;
    contract.activateAgreement(0);
    contract.caller = "ST1LENDER";
    const evidence = new Uint8Array(256).fill(0);
    const result = contract.initiateDispute(0, evidence);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const agreement = contract.state.agreements.get(0);
    expect(agreement?.status).toBe(STATUS_DISPUTED);
  });

  it("resolves dispute successfully", () => {
    contract.caller = "ST2BORROWER";
    const conditionHash = new Uint8Array(32).fill(1);
    contract.createAgreement(
      1,
      "ST1LENDER",
      "ST2BORROWER",
      10,
      30,
      100,
      500,
      5,
      "STX",
      "MuseumA",
      conditionHash,
      200,
      60
    );
    contract.caller = "ST1LENDER";
    contract.blockHeight = 15;
    contract.activateAgreement(0);
    contract.caller = "ST1LENDER";
    const evidence = new Uint8Array(256).fill(0);
    contract.initiateDispute(0, evidence);
    contract.caller = "SP000000000000000000002Q6VF78";
    const result = contract.resolveDispute(0, "ST1LENDER");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const agreement = contract.state.agreements.get(0);
    expect(agreement?.status).toBe(STATUS_CLOSED);
    expect(contract.stxTransfers[contract.stxTransfers.length - 1]).toEqual({ amount: 500, from: "SP000000000000000000002Q6VF78", to: "ST1LENDER" });
  });

  it("updates agreement successfully", () => {
    contract.caller = "ST2BORROWER";
    const conditionHash = new Uint8Array(32).fill(1);
    contract.createAgreement(
      1,
      "ST1LENDER",
      "ST2BORROWER",
      10,
      30,
      100,
      500,
      5,
      "STX",
      "MuseumA",
      conditionHash,
      200,
      60
    );
    contract.caller = "ST1LENDER";
    const result = contract.updateAgreement(0, 45, 150, 600);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const agreement = contract.state.agreements.get(0);
    expect(agreement?.duration).toBe(45);
    expect(agreement?.rentalFee).toBe(150);
    expect(agreement?.deposit).toBe(600);
    const update = contract.state.agreementUpdates.get(0);
    expect(update?.updateDuration).toBe(45);
    expect(update?.updateFee).toBe(150);
    expect(update?.updateDeposit).toBe(600);
    expect(update?.updater).toBe("ST1LENDER");
  });

  it("rejects update after activation", () => {
    contract.caller = "ST2BORROWER";
    const conditionHash = new Uint8Array(32).fill(1);
    contract.createAgreement(
      1,
      "ST1LENDER",
      "ST2BORROWER",
      10,
      30,
      100,
      500,
      5,
      "STX",
      "MuseumA",
      conditionHash,
      200,
      60
    );
    contract.caller = "ST1LENDER";
    contract.blockHeight = 15;
    contract.activateAgreement(0);
    const result = contract.updateAgreement(0, 45, 150, 600);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_STATUS);
  });

  it("returns correct agreement count", () => {
    contract.caller = "ST2BORROWER";
    const conditionHash = new Uint8Array(32).fill(1);
    contract.createAgreement(
      1,
      "ST1LENDER",
      "ST2BORROWER",
      10,
      30,
      100,
      500,
      5,
      "STX",
      "MuseumA",
      conditionHash,
      200,
      60
    );
    contract.createAgreement(
      2,
      "ST1LENDER",
      "ST2BORROWER",
      20,
      60,
      200,
      1000,
      10,
      "USD",
      "GalleryB",
      conditionHash,
      300,
      70
    );
    const result = contract.getAgreementCount();
    expect(result.ok).toBe(true);
    expect(result.value).toBe(2);
  });

  it("rejects creation when max agreements exceeded", () => {
    contract.caller = "ST2BORROWER";
    const conditionHash = new Uint8Array(32).fill(1);
    contract.state.maxAgreements = 1;
    contract.createAgreement(
      1,
      "ST1LENDER",
      "ST2BORROWER",
      10,
      30,
      100,
      500,
      5,
      "STX",
      "MuseumA",
      conditionHash,
      200,
      60
    );
    const result = contract.createAgreement(
      2,
      "ST1LENDER",
      "ST2BORROWER",
      20,
      60,
      200,
      1000,
      10,
      "USD",
      "GalleryB",
      conditionHash,
      300,
      70
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_MAX_AGREEMENTS_EXCEEDED);
  });

  it("rejects return with mismatched hash", () => {
    contract.caller = "ST2BORROWER";
    const conditionHash = new Uint8Array(32).fill(1);
    contract.createAgreement(
      1,
      "ST1LENDER",
      "ST2BORROWER",
      10,
      30,
      100,
      500,
      5,
      "STX",
      "MuseumA",
      conditionHash,
      200,
      60
    );
    contract.caller = "ST1LENDER";
    contract.blockHeight = 15;
    contract.activateAgreement(0);
    contract.caller = "ST2BORROWER";
    contract.blockHeight = 35;
    const wrongHash = new Uint8Array(32).fill(2);
    const result = contract.returnItem(0, wrongHash);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_CONDITION);
  });
});