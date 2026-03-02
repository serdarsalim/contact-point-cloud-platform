# Contact Point Cloud Platform

Contact Point Cloud Platform is the admin website behind [Contact Point](https://serdarsalim.com/contact-point).

It lets teams manage shared templates in one place, then deliver those templates into the extension as read-only cloud templates.

## What This App Does (In Plain English)

- Keeps your shared templates in the cloud (Email, WhatsApp, Notes)
- Lets admins manage templates, org admins, and API tokens
- Sends templates to the Contact Point extension for daily use
- Keeps cloud templates read-only inside the extension
- Leaves local extension templates untouched

## How It Works With Contact Point

This app is not useful by itself for end users.

It works together with the Contact Point extension:

1. An admin creates templates and API tokens in this web app.
2. A user pastes their API token into Contact Point settings.
3. Contact Point pulls cloud templates for that organization.
4. The user can use those templates in the extension, but cannot edit them there.

Without the Contact Point extension, this app is only an admin/control panel.

## Who Uses What

- `SUPERADMIN`
  - Creates organizations
  - Assigns/removes org admins
  - Has full access across organizations

- `ADMIN`
  - Manages templates and API tokens for assigned orgs
  - Manages org admins where permitted

## Why This Exists

It solves the common team problem:

- Local templates are personal and editable
- Cloud templates are shared and controlled

So teams get consistency without breaking individual workflows.

## Security Basics

- API tokens are shown once, then only stored as secure hashes
- Tokens can be deleted/rotated instantly
- Revoked/deleted tokens stop working immediately
- Cloud data is scoped by organization

## Quick Start (Non-Technical)

To use the full system:

1. Open this cloud admin app
2. Create an organization and admin users
3. Create templates
4. Create API token(s)
5. In Contact Point extension settings, paste token and connect

## Product Link

Contact Point extension:
[https://serdarsalim.com/contact-point](https://serdarsalim.com/contact-point)

## License

Proprietary software. All rights reserved.
