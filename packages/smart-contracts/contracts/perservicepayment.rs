#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, token, Address, Env, Map, String, Symbol,
};


#[derive(Clone, Copy, Debug, PartialEq, Eq)]
#[repr(u32)]
#[contracttype]
pub enum InvoiceStatus {
    Unpaid = 0,
    Paid = 1,
    Cancelled = 2,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Invoice {
    pub id: u64,
    pub patient: Address,
    pub service_id: String,
    pub amount: i128,
    pub token: Address, 
    pub status: InvoiceStatus,
}



#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    NotInitialized = 1,
    AlreadyInitialized = 2,
    InvoiceNotFound = 3,
    NotAdmin = 4,
    NotPatient = 5,
    InvoiceNotPayable = 6, 
}



#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Admin,
    Invoices,     
    NextInvoiceId,
}

#[contract]
pub struct PerServicePaymentContract;

#[contractimpl]
impl PerServicePaymentContract {
    
    
    pub fn initialize(env: Env, admin: Address) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::NextInvoiceId, &0u64);
        env.storage().instance().set(&DataKey::Invoices, &Map::<u64, Invoice>::new(&env));
        Ok(())
    }

    
    pub fn create_invoice(
        env: Env,
        patient: Address,
        service_id: String,
        amount: i128,
        token: Address,
    ) -> Result<u64, Error> {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).ok_or(Error::NotInitialized)?;
        admin.require_auth();

        if amount <= 0 {
            panic!("Amount must be positive");
        }

        let invoice_id: u64 = env.storage().instance().get(&DataKey::NextInvoiceId).unwrap();
        
        let invoice = Invoice {
            id: invoice_id,
            patient: patient.clone(),
            service_id,
            amount,
            token,
            status: InvoiceStatus::Unpaid,
        };

        let mut invoices: Map<u64, Invoice> = env.storage().instance().get(&DataKey::Invoices).unwrap();
        invoices.set(invoice_id, invoice);
        env.storage().instance().set(&DataKey::Invoices, &invoices);
        env.storage().instance().set(&DataKey::NextInvoiceId, &(invoice_id + 1));
        
        
        env.events().publish(
            (Symbol::new(&env, "invoice_created"), &admin),
            (invoice_id, &patient, amount),
        );

        Ok(invoice_id)
    }

    
    pub fn pay_invoice(env: Env, patient: Address, invoice_id: u64) -> Result<(), Error> {
        patient.require_auth();

        let mut invoices: Map<u64, Invoice> = env.storage().instance().get(&DataKey::Invoices).ok_or(Error::NotInitialized)?;
        let mut invoice = invoices.get(invoice_id).ok_or(Error::InvoiceNotFound)?;

        
        if invoice.patient != patient {
            return Err(Error::NotPatient);
        }
        if invoice.status != InvoiceStatus::Unpaid {
            return Err(Error::InvoiceNotPayable);
        }

        
        let clinic_address: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        let token_client = token::Client::new(&env, &invoice.token);
        token_client.transfer(&patient, &clinic_address, &invoice.amount);

        
        invoice.status = InvoiceStatus::Paid;
        invoices.set(invoice_id, invoice);
        env.storage().instance().set(&DataKey::Invoices, &invoices);

        
        env.events().publish(
            (Symbol::new(&env, "invoice_paid"), &patient),
            invoice_id,
        );
        
        Ok(())
    }

    
    pub fn cancel_invoice(env: Env, invoice_id: u64) -> Result<(), Error> {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).ok_or(Error::NotInitialized)?;
        admin.require_auth();

        let mut invoices: Map<u64, Invoice> = env.storage().instance().get(&DataKey::Invoices).unwrap();
        let mut invoice = invoices.get(invoice_id).ok_or(Error::InvoiceNotFound)?;
        
        if invoice.status != InvoiceStatus::Unpaid {
            return Err(Error::InvoiceNotPayable);
        }

        invoice.status = InvoiceStatus::Cancelled;
        invoices.set(invoice_id, invoice);
        env.storage().instance().set(&DataKey::Invoices, &invoices);
        
        env.events().publish(
            (Symbol::new(&env, "invoice_cancelled"), &admin),
            invoice_id,
        );

        Ok(())
    }

    
    pub fn get_invoice(env: Env, invoice_id: u64) -> Result<Invoice, Error> {
        let invoices: Map<u64, Invoice> = env.storage().instance().get(&DataKey::Invoices).ok_or(Error::NotInitialized)?;
        invoices.get(invoice_id).ok_or(Error::InvoiceNotFound)
    }
}
