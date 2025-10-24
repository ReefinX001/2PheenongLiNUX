# Project Structure Organization

## Overview

The project has been reorganized into a modular structure based on business domains.

## Structure

### Backend Structure

```
├── controllers/          # Business logic controllers
│   ├── accounting/      # Accounting system controllers
│   ├── pos/            # Point of Sale controllers
│   ├── inventory/      # Inventory management controllers
│   ├── product/        # Product management controllers
│   ├── procurement/    # Procurement controllers
│   ├── hr/             # Human resources controllers
│   ├── customer/       # Customer management controllers
│   ├── order/          # Order management controllers
│   ├── payment/        # Payment processing controllers
│   ├── contract/       # Contract management controllers
│   ├── marketing/      # Marketing controllers
│   ├── report/         # Reporting controllers
│   └── system/         # System administration controllers
│
├── models/              # Database models
│   ├── accounting/     # Accounting models
│   ├── pos/           # POS models
│   ├── inventory/     # Inventory models
│   ├── product/       # Product models
│   ├── procurement/   # Procurement models
│   ├── hr/            # HR models
│   ├── customer/      # Customer models
│   ├── order/         # Order models
│   ├── payment/       # Payment models
│   ├── contract/      # Contract models
│   ├── marketing/     # Marketing models
│   └── system/        # System models
│
├── routes/              # API routes
│   ├── accounting/    # Accounting routes
│   ├── pos/          # POS routes
│   ├── inventory/    # Inventory routes
│   ├── product/      # Product routes
│   ├── procurement/  # Procurement routes
│   ├── hr/           # HR routes
│   ├── customer/     # Customer routes
│   ├── order/        # Order routes
│   ├── payment/      # Payment routes
│   ├── contract/     # Contract routes
│   ├── marketing/    # Marketing routes
│   └── system/       # System routes
│
└── views/               # Server-side views
    ├── accounting/    # Accounting views
    ├── pos/          # POS views
    ├── inventory/    # Inventory views
    ├── product/      # Product views
    ├── procurement/  # Procurement views
    ├── hr/           # HR views
    ├── customer/     # Customer views
    ├── order/        # Order views
    ├── payment/      # Payment views
    ├── contract/     # Contract views
    ├── marketing/    # Marketing views
    ├── report/       # Report views
    └── system/       # System views
```

### Frontend Structure

```
src/
├── components/          # Reusable components
│   ├── accounting/     # Accounting components
│   ├── pos/           # POS components
│   ├── inventory/     # Inventory components
│   ├── product/       # Product components
│   ├── customer/      # Customer components
│   └── common/        # Shared components
│
├── pages/              # Page components
│   ├── accounting/    # Accounting pages
│   ├── pos/          # POS pages
│   ├── inventory/    # Inventory pages
│   ├── product/      # Product pages
│   └── customer/     # Customer pages
│
└── services/           # API services and utilities
    ├── api/          # API service modules
    └── utils/        # Utility functions
```

## Benefits

1. **Modular Structure** - Easy to find and maintain code
2. **Domain-Driven** - Organized by business function
3. **Scalable** - Easy to add new features
4. **Clear Separation** - Frontend and backend clearly separated
5. **Consistent Naming** - Predictable file locations

## Migration Guide

1. Move existing files to new structure
2. Update all import/require statements
3. Update route definitions
4. Test all functionality
5. Update deployment scripts
