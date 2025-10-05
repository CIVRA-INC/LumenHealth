// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Authority
 * @dev A central contract for Role-Based Access Control (RBAC).
 * It manages three roles: ADMIN, DOCTOR, and PATIENT.
 * The contract deployer is automatically assigned the ADMIN role.
 */
contract Authority {
    enum Role {
        NONE, 
        ADMIN,
        DOCTOR,
        PATIENT
    }

    
    mapping(address => Role) public roles;

    
    event RoleGranted(address indexed account, Role indexed role);
    event RoleRevoked(address indexed account, Role indexed role);

    /**
     * @dev Modifier to restrict function access to only ADMINs.
     */
    modifier onlyAdmin() {
        require(roles[msg.sender] == Role.ADMIN, "Authority: Caller is not an admin");
        _;
    }

    /**
     * @dev Sets the deployer's role to ADMIN upon contract creation.
     */
    constructor() {
        _grantRole(msg.sender, Role.ADMIN);
    }

    /**
     * @notice Grants the DOCTOR role to a specified address.
     * @dev Can only be called by an ADMIN.
     * @param _account The address to be granted the DOCTOR role.
     */
    function grantDoctorRole(address _account) external onlyAdmin {
        require(_account != address(0), "Authority: Granting role to the zero address");
        require(roles[_account] != Role.DOCTOR, "Authority: Account already has DOCTOR role");
        _grantRole(_account, Role.DOCTOR);
    }

    /**
     * @notice Revokes the DOCTOR role from a specified address.
     * @dev Can only be called by an ADMIN. The address role is set to NONE.
     * @param _account The address from which to revoke the DOCTOR role.
     */
    function revokeDoctorRole(address _account) external onlyAdmin {
        require(_account != address(0), "Authority: Revoking role from the zero address");
        require(roles[_account] == Role.DOCTOR, "Authority: Account is not a DOCTOR");
        _revokeRole(_account);
    }

    /**
     * @dev Internal function to grant a role.
     */
    function _grantRole(address _account, Role _role) internal {
        roles[_account] = _role;
        emit RoleGranted(_account, _role);
    }

    /**
     * @dev Internal function to revoke a role (sets it to NONE).
     */
    function _revokeRole(address _account) internal {
        Role oldRole = roles[_account];
        roles[_account] = Role.NONE;
        emit RoleRevoked(_account, oldRole);
    }
}