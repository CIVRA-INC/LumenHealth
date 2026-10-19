import { identityStore } from "../repositories/identity.repository.js";
import { runIdentityRepositoryContract } from "./identity.repository.contract.js";

runIdentityRepositoryContract("in-memory", () => identityStore);
