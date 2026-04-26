/**
 * Mock HCM Seed Data
 * Provides initial data for 10+ employees with various balance situations
 */

export const SEED_DATA = {
  employees: [
    // Emp 1: Sufficient balance
    {
      employeeId: 'emp001',
      name: 'John Smith',
      balances: [
        {
          locationId: 'NYC',
          leaveType: 'PTO',
          available: 10,
          used: 0,
          pending: 0,
        },
        {
          locationId: 'NYC',
          leaveType: 'SICK_LEAVE',
          available: 5,
          used: 1,
          pending: 0,
        },
      ],
    },
    // Emp 2: Low balance
    {
      employeeId: 'emp002',
      name: 'Jane Doe',
      balances: [
        {
          locationId: 'NYC',
          leaveType: 'PTO',
          available: 1,
          used: 9,
          pending: 0,
        },
        {
          locationId: 'SF',
          leaveType: 'PERSONAL',
          available: 2,
          used: 3,
          pending: 1,
        },
      ],
    },
    // Emp 3: Zero balance
    {
      employeeId: 'emp003',
      name: 'Bob Johnson',
      balances: [
        {
          locationId: 'SF',
          leaveType: 'SICK_LEAVE',
          available: 0,
          used: 5,
          pending: 0,
        },
        {
          locationId: 'SF',
          leaveType: 'PTO',
          available: 3,
          used: 2,
          pending: 0,
        },
      ],
    },
    // Emp 4: Mid balance
    {
      employeeId: 'emp004',
      name: 'Alice Williams',
      balances: [
        {
          locationId: 'LONDON',
          leaveType: 'PTO',
          available: 5,
          used: 5,
          pending: 0,
        },
        {
          locationId: 'LONDON',
          leaveType: 'SICK_LEAVE',
          available: 3,
          used: 0,
          pending: 1,
        },
      ],
    },
    // Emp 5: High balance
    {
      employeeId: 'emp005',
      name: 'Charlie Brown',
      balances: [
        {
          locationId: 'NYC',
          leaveType: 'PERSONAL',
          available: 8,
          used: 1,
          pending: 0,
        },
        {
          locationId: 'NYC',
          leaveType: 'PTO',
          available: 12,
          used: 0,
          pending: 0,
        },
      ],
    },
    // Emp 6: Multiple locations, various balances
    {
      employeeId: 'emp006',
      name: 'Diana Prince',
      balances: [
        {
          locationId: 'SF',
          leaveType: 'PTO',
          available: 7,
          used: 2,
          pending: 1,
        },
        {
          locationId: 'LONDON',
          leaveType: 'SICK_LEAVE',
          available: 4,
          used: 1,
          pending: 0,
        },
        {
          locationId: 'NYC',
          leaveType: 'PERSONAL',
          available: 1,
          used: 4,
          pending: 0,
        },
      ],
    },
    // Emp 7: Just used all PTO
    {
      employeeId: 'emp007',
      name: 'Eve Adams',
      balances: [
        {
          locationId: 'SF',
          leaveType: 'PTO',
          available: 0,
          used: 10,
          pending: 0,
        },
        {
          locationId: 'SF',
          leaveType: 'SICK_LEAVE',
          available: 5,
          used: 0,
          pending: 0,
        },
      ],
    },
    // Emp 8: Edge case - exactly matching request
    {
      employeeId: 'emp008',
      name: 'Frank Miller',
      balances: [
        {
          locationId: 'NYC',
          leaveType: 'PTO',
          available: 3,
          used: 2,
          pending: 0,
        },
        {
          locationId: 'LONDON',
          leaveType: 'PERSONAL',
          available: 2,
          used: 3,
          pending: 0,
        },
      ],
    },
    // Emp 9: Negative balance (should not happen but testing edge case)
    {
      employeeId: 'emp009',
      name: 'Grace Lee',
      balances: [
        {
          locationId: 'NYC',
          leaveType: 'SICK_LEAVE',
          available: 6,
          used: 1,
          pending: 0,
        },
        {
          locationId: 'SF',
          leaveType: 'PTO',
          available: 2,
          used: 3,
          pending: 0,
        },
      ],
    },
    // Emp 10: Many pending requests
    {
      employeeId: 'emp010',
      name: 'Henry Davis',
      balances: [
        {
          locationId: 'NYC',
          leaveType: 'PTO',
          available: 4,
          used: 2,
          pending: 3,
        },
        {
          locationId: 'SF',
          leaveType: 'SICK_LEAVE',
          available: 5,
          used: 0,
          pending: 0,
        },
      ],
    },
  ],
  locations: ['NYC', 'SF', 'LONDON'],
  leaveTypes: ['PTO', 'SICK_LEAVE', 'PERSONAL'],
};
