#![no_std]
use soroban_sdk::{contract, contractimpl, token, Address, Env, String, Val, Vec};


#[derive(Clone, Copy, PartialEq, Eq)]
#[repr(u32)]
pub enum Status {
    AwaitingDeposit = 0, 
    Funded = 1,          
    Released = 2,        
    Refunded = 3,        
}


pub enum DataKey {
    Patient,
    Specialist,
    Arbiter,
    Token,
    Amount,
    Status,
}

#[contract]
pub struct EscrowContract;

#[contractimpl]
impl EscrowContract {
    
    
    
    
    pub fn initialize(
        env: Env,
        patient: Address,
        specialist: Address,
        arbiter: Address,
        token: Address,
        amount: i128,
    ) {
        if env.storage().instance().has(&DataKey::Status) {
            panic!("Contract has already been initialized");
        }
        if amount <= 0 {
            panic!("Amount must be positive");
        }

        env.storage().instance().set(&DataKey::Patient, &patient);
        env.storage().instance().set(&DataKey::Specialist, &specialist);
        env.storage().instance().set(&DataKey::Arbiter, &arbiter);
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage().instance().set(&DataKey::Amount, &amount);
        env.storage().instance().set(&DataKey::Status, &Status::AwaitingDeposit);
    }

    
    
    
    pub fn deposit(env: Env, from: Address) {
        
        from.require_auth();

        
        let patient: Address = env.storage().instance().get(&DataKey::Patient).unwrap();
        if from != patient {
            panic!("Only the patient can deposit funds");
        }

        
        let status: Status = env.storage().instance().get(&DataKey::Status).unwrap();
        if status != Status::AwaitingDeposit {
            panic!("Contract is not awaiting deposit");
        }

        
        let token_id: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        let amount: i128 = env.storage().instance().get(&DataKey::Amount).unwrap();
        let token_client = token::Client::new(&env, &token_id);
        token_client.transfer(&from, &env.current_contract_address(), &amount);

        
        env.storage().instance().set(&DataKey::Status, &Status::Funded);
        env.events().publish((Symbol::new(&env, "deposit"),), (patient, amount));
    }

    
    
    
    pub fn request_release(env: Env) {
        let specialist: Address = env.storage().instance().get(&DataKey::Specialist).unwrap();
        specialist.require_auth();

        let status: Status = env.storage().instance().get(&DataKey::Status).unwrap();
        if status != Status::Funded {
            panic!("Contract is not in a funded state");
        }
        
        env.events().publish((Symbol::new(&env, "request_release"),), (specialist,));
    }

    
    pub fn confirm_release(env: Env) {
        let patient: Address = env.storage().instance().get(&DataKey::Patient).unwrap();
        patient.require_auth();

        let status: Status = env.storage().instance().get(&DataKey::Status).unwrap();
        if status != Status::Funded {
            panic!("Contract is not in a funded state");
        }

        
        Self::internal_release(&env);
    }

    
    pub fn force_release(env: Env) {
        let arbiter: Address = env.storage().instance().get(&DataKey::Arbiter).unwrap();
        arbiter.require_auth();

        let status: Status = env.storage().instance().get(&DataKey::Status).unwrap();
        if status != Status::Funded {
            panic!("Contract is not in a funded state");
        }
        
        
        Self::internal_release(&env);
    }

    
    pub fn force_refund(env: Env) {
        let arbiter: Address = env.storage().instance().get(&DataKey::Arbiter).unwrap();
        arbiter.require_auth();
        
        let status: Status = env.storage().instance().get(&DataKey::Status).unwrap();
        if status != Status::Funded {
            panic!("Contract is not in a funded state");
        }

        let token_id: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        let amount: i128 = env.storage().instance().get(&DataKey::Amount).unwrap();
        let patient: Address = env.storage().instance().get(&DataKey::Patient).unwrap();
        let token_client = token::Client::new(&env, &token_id);

        
        token_client.transfer(&env.current_contract_address(), &patient, &amount);

        
        env.storage().instance().set(&DataKey::Status, &Status::Refunded);
        env.events().publish((Symbol::new(&env, "refund"),), (arbiter, patient, amount));
    }
    
    
    fn internal_release(env: &Env) {
        let token_id: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        let amount: i128 = env.storage().instance().get(&DataKey::Amount).unwrap();
        let specialist: Address = env.storage().instance().get(&DataKey::Specialist).unwrap();
        let token_client = token::Client::new(env, &token_id);

        
        token_client.transfer(&env.current_contract_address(), &specialist, &amount);

        
        env.storage().instance().set(&DataKey::Status, &Status::Released);
        env.events().publish((Symbol::new(&env, "release"),), (specialist, amount));
    }
}