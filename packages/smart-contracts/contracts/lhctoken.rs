#![no_std]
use soroban_sdk::{contract, contractimpl, token, Address, Env, String};

pub enum DataKey {
    Admin,
    Token,
}

#[contract]
pub struct Distributor;

#[contractimpl]
impl Distributor {

    pub fn initialize(env: Env, admin: Address, token: Address) {
    
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("Distributor has already been initialized");
        }
        
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Token, &token);
    }

    pub fn reward_patient(env: Env, patient: Address, amount: i128) {
    
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

    
        if amount <= 0 {
            panic!("Reward amount must be positive");
        }
        
        let token_address: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        
        let token_client = token::Client::new(&env, &token_address);
    
        let contract_address = env.current_contract_address();
        token_client.transfer(&contract_address, &patient, &amount);
        
        env.events().publish(
            (String::from_str(&env, "reward"), admin),
            (patient, amount),
        );
    }
}
