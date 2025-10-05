#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, token, Address, Env, Map, String, Symbol,
};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Plan {
    pub id: u32,
    pub name: String,
    pub price: i128,
    pub duration_seconds: u64, 
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Subscription {
    pub plan_id: u32,
    pub start_time: u64,
    pub expiry_date: u64,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
#[repr(u32)]
pub enum SubscriptionStatus {
    Inactive = 0, 
    Active = 1,   
    Expired = 2,  
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    NotInitialized = 1,
    AlreadyInitialized = 2,
    PlanNotFound = 3,
    NotAdmin = 4,
    NotSubscribed = 5,
    StillActive = 6,
}


#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Admin,
    Plans,          
    Subscriptions,  
    LhcToken,
    NextPlanId,
}

#[contract]
pub struct SubscriptionContract;

#[contractimpl]
impl SubscriptionContract {
    
    pub fn initialize(env: Env, admin: Address, lhc_token: Address) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::LhcToken, &lhc_token);
        env.storage().instance().set(&DataKey::NextPlanId, &0u32);
        
        env.storage().instance().set(&DataKey::Plans, &Map::<u32, Plan>::new(&env));
        env.storage().instance().set(&DataKey::Subscriptions, &Map::<Address, Subscription>::new(&env));
        Ok(())
    }

    
    pub fn create_plan(
        env: Env,
        name: String,
        price: i128,
        duration_seconds: u64,
    ) -> Result<u32, Error> {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).ok_or(Error::NotInitialized)?;
        admin.require_auth();

        let mut next_plan_id: u32 = env.storage().instance().get(&DataKey::NextPlanId).unwrap();
        let plan = Plan { id: next_plan_id, name, price, duration_seconds };
        
        let mut plans: Map<u32, Plan> = env.storage().instance().get(&DataKey::Plans).unwrap();
        plans.set(next_plan_id, plan);
        env.storage().instance().set(&DataKey::Plans, &plans);

        env.storage().instance().set(&DataKey::NextPlanId, &(next_plan_id + 1));
        Ok(next_plan_id)
    }

    
    pub fn subscribe(&self, env: Env, patient: Address, plan_id: u32) -> Result<(), Error> {
        patient.require_auth();

        let plans: Map<u32, Plan> = env.storage().instance().get(&DataKey::Plans).ok_or(Error::NotInitialized)?;
        let plan = plans.get(plan_id).ok_or(Error::PlanNotFound)?;

        
        let token_id: Address = env.storage().instance().get(&DataKey::LhcToken).unwrap();
        let token = token::Client::new(&env, &token_id);
        token.transfer(&patient, &env.current_contract_address(), &plan.price);

        let start_time = env.ledger().timestamp();
        let expiry_date = start_time + plan.duration_seconds;
        let subscription = Subscription { plan_id, start_time, expiry_date };

        let mut subscriptions: Map<Address, Subscription> = env.storage().instance().get(&DataKey::Subscriptions).unwrap();
        subscriptions.set(patient.clone(), subscription);
        env.storage().instance().set(&DataKey::Subscriptions, &subscriptions);
        
        env.events().publish(
            (Symbol::new(&env, "subscribe"), patient),
            (plan_id),
        );
        Ok(())
    }

    
    
    
    pub fn charge_renewal(&self, env: Env, patient: Address) -> Result<(), Error> {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).ok_or(Error::NotInitialized)?;
        admin.require_auth();

        let mut subscriptions: Map<Address, Subscription> = env.storage().instance().get(&DataKey::Subscriptions).unwrap();
        let mut subscription = subscriptions.get(patient.clone()).ok_or(Error::NotSubscribed)?;

        let plans: Map<u32, Plan> = env.storage().instance().get(&DataKey::Plans).unwrap();
        let plan = plans.get(subscription.plan_id).unwrap();

        
        let token_id: Address = env.storage().instance().get(&DataKey::LhcToken).unwrap();
        let token = token::Client::new(&env, &token_id);
        token.transfer(&patient, &env.current_contract_address(), &plan.price);

        
        subscription.expiry_date += plan.duration_seconds;
        subscriptions.set(patient.clone(), subscription);
        env.storage().instance().set(&DataKey::Subscriptions, &subscriptions);

        env.events().publish(
            (Symbol::new(&env, "renew"), patient),
            (plan.id),
        );
        Ok(())
    }

    
    pub fn check_subscription_status(
        &self,
        env: Env,
        patient: Address,
    ) -> SubscriptionStatus {
        let subscriptions: Map<Address, Subscription> = match env.storage().instance().get(&DataKey::Subscriptions) {
            Some(s) => s,
            None => return SubscriptionStatus::Inactive,
        };
        
        match subscriptions.get(patient) {
            Some(subscription) => {
                if env.ledger().timestamp() >= subscription.expiry_date {
                    SubscriptionStatus::Expired
                } else {
                    SubscriptionStatus::Active
                }
            }
            None => SubscriptionStatus::Inactive,
        }
    }
}
