# Security Policy

## Reporting a vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, report them privately via GitHub's
[Security Advisories](https://github.com/DonatNathan/palantir-foundry-map/security/advisories/new)
("Report a vulnerability"), or email the maintainer at `nathandonatt@gmail.com`.

Please include:
- A description of the issue and its impact.
- Steps to reproduce (proof-of-concept if possible).
- Any suggested remediation.

You can expect an initial response within a few days. Thanks for helping keep the project
and its users safe.

## Scope notes

This project's threat model is simple:
- **Reads are public** (`GET /api/graph`) — the data is meant to be public.
- **Writes require an admin token** (`POST/PUT/DELETE`), compared in constant time and
  supplied only as a server-side environment variable.

When deploying, the essentials are: keep `ADMIN_TOKEN` secret and strong, restrict
`CORS_ORIGIN` to your frontend, keep PostgreSQL off the public internet, and serve
everything over HTTPS.
