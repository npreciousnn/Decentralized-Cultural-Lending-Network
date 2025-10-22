# 🏛️ Decentralized Cultural Lending Network

Welcome to a revolutionary peer-to-peer platform for lending cultural items like artifacts, artworks, and historical relics for exhibitions! This Web3 project addresses real-world challenges in the cultural heritage sector, such as lack of trust between lenders and borrowers, high intermediary costs from museums or galleries, difficulties in verifying item authenticity, and disputes over damage or late returns. By leveraging the Stacks blockchain and Clarity smart contracts, we enable secure, transparent, and automated lending without centralized authorities.

## ✨ Features
🔒 Secure registration of cultural items with immutable metadata  
🤝 Peer-to-peer lending requests and automated agreements  
💰 Escrow for deposits and rental fees using STX or SIP-10 tokens  
📜 Built-in dispute resolution with on-chain voting  
✅ Authenticity verification through hashed proofs and oracles  
🛡️ Optional insurance integration for item protection  
📈 User reputation system based on past lendings  
⏰ Time-bound loans with automatic penalties for delays  
🔍 Transparent tracking of item status during exhibitions  

## 🛠 How It Works
This project uses 8 Clarity smart contracts to handle various aspects of the lending process, ensuring decentralization and automation. Here's a high-level overview:

### Smart Contracts Overview
1. **UserRegistry.clar**: Manages user profiles, including KYC-like verification and reputation scores.  
2. **ItemRegistry.clar**: Allows owners to register cultural items with metadata (e.g., description, images via IPFS hashes, authenticity proofs). Prevents duplicate registrations.  
3. **LendingOffer.clar**: Enables owners to create lending offers with terms like duration, rental fee, and deposit requirements.  
4. **LoanAgreement.clar**: Automates the creation of binding loan contracts between lenders and borrowers, enforcing terms via blockchain.  
5. **EscrowManager.clar**: Handles secure escrow of funds (deposits and fees) and releases them based on contract fulfillment.  
6. **DisputeResolver.clar**: Facilitates on-chain disputes with evidence submission and community or oracle-based resolution.  
7. **InsurancePool.clar**: Manages a decentralized insurance fund where users can stake for coverage against damage or loss.  
8. **ReputationTracker.clar**: Tracks and updates user ratings post-loan, influencing future lending eligibility.

**For Lenders (Item Owners)**  
- Register your cultural item in ItemRegistry with a unique hash (e.g., SHA-256 of photos/docs) and details.  
- Create a lending offer via LendingOffer, specifying terms like exhibition duration and fees.  
- Once a borrower accepts, LoanAgreement locks the deal, and EscrowManager holds the deposit.  
- After the exhibition, confirm return via the contract—if all good, funds release automatically. Use DisputeResolver if issues arise.

**For Borrowers (Exhibition Organizers)**  
- Browse available items (off-chain UI querying the blockchain).  
- Submit a request and accept terms to trigger LoanAgreement.  
- Pay deposit/fee into EscrowManager.  
- Upon item receipt, update status on-chain. Return the item and get your deposit back—penalties apply for delays via timed functions.

**For Verifiers/Insurers**  
- Use ItemRegistry to check authenticity and ownership history.  
- Participate in InsurancePool to underwrite loans and earn rewards.  
- In disputes, submit evidence to DisputeResolver for resolution.

That's it! This setup solves trust issues in cultural lending by making everything transparent and enforceable on the blockchain, reducing costs and opening access to global exhibitions. Build it with Clarity on Stacks for Bitcoin-secured settlements.