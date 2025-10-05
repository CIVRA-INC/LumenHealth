// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Authority.sol";

/**
 * @title Subscription
 * @dev Another example contract showing reusable permission logic.
 */
contract Subscription {
    //
    Authority public immutable authority;

    event PlanDefined(address indexed creator, uint256 planId, uint256 price);

    /**
     * @dev Modifier to check if the caller is an ADMIN.
     */
    modifier onlyAdmin() {
        require(
            authority.roles(msg.sender) == Authority.Role.ADMIN,
            "Subscription: Caller is not an admin"
        );
        _;
    }

    /**
     * @dev Links this contract to the deployed Authority contract.
     * @param _authorityAddress The address of the deployed Authority contract.
     */
    constructor(address _authorityAddress) {
        require(_authorityAddress != address(0), "Subscription: Invalid authority address");
        authority = Authority(_authorityAddress);
    }

    /**
     * @notice Defines a new subscription plan.
     * @dev This function is restricted to ADMINs only.
     * @param _planId A unique ID for the new plan.
     * @param _price The price of the plan.
     */
    function define_subscription_plan(uint256 _planId, uint256 _price) external onlyAdmin {
        
        emit PlanDefined(msg.sender, _planId, _price);
    }
}