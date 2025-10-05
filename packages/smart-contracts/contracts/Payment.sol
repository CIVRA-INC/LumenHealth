// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Authority.sol";

/**
 * @title Payment
 * @dev Example contract demonstrating how to use the Authority contract
 * for permissioned actions.
 */
contract Payment {
    //
    Authority public immutable authority;

    
    event InvoiceCreated(address indexed creator, uint256 amount);

    /**
     * @dev Modifier to check if the caller is an ADMIN or a DOCTOR
     * by querying the Authority contract.
     */
    modifier onlyAdminOrDoctor() {
        Authority.Role callerRole = authority.roles(msg.sender);
        require(
            callerRole == Authority.Role.ADMIN || callerRole == Authority.Role.DOCTOR,
            "Payment: Caller is not an admin or doctor"
        );
        _;
    }

    /**
     * @dev Links this contract to the deployed Authority contract.
     * @param _authorityAddress The address of the deployed Authority contract.
     */
    constructor(address _authorityAddress) {
        require(_authorityAddress != address(0), "Payment: Invalid authority address");
        authority = Authority(_authorityAddress);
    }

    /**
     * @notice Creates an invoice.
     * @dev This function is restricted to ADMINs and DOCTORs.
     * @param _amount The invoice amount.
     */
    function create_invoice(uint256 _amount) external onlyAdminOrDoctor {
        
        emit InvoiceCreated(msg.sender, _amount);
    }
}