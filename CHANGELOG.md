# Changelog

All notable changes to the Chaster project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- Removed broken image reference in README.md

## [1.0.0] - 2025-12-26

### Added
- Comprehensive stress testing suite with multiple load scenarios
- Test environment isolation for reliable testing
- Integration test support with dedicated npm scripts
- Token management CLI for admin recovery (`npm run token`)
- Theme toggle in settings UI
- Custom dialogs and toast notifications for better UX
- API call logging (ApiLog model)
- Coverage reporting for tests (`npm run test:coverage`)

### Changed
- Migrated to Tailwind CSS 4 with CSS-first configuration
- Comprehensive documentation rewrite for service architecture
- Improved error handling for 401 unauthorized responses
- Skip integration tests by default (use `npm run test:integration`)
- Auto-fetch token for stress tests from database

### Fixed
- Resolved React hooks violation in console layout
- Fixed token response wrapping for consistent frontend parsing
- Removed aggressive test cleanup that broke dependencies
- Fixed API validation issues in integration tests
- Database file tracking in git (now properly ignored)

### Documentation
- Added comprehensive testing documentation (TESTING.md, STRESS_TESTING.md)
- Updated README, PRD, and Deployment Guide for service architecture
- Added API reference documentation
- Created .env.example for easier configuration

## [0.1.0] - 2025-12 (Initial Release)

### Added
- Core timelock encryption service using drand network
- REST API v1 with Bearer token authentication
- Admin Console for managing items and tokens
- SQLite database with Prisma ORM
- Docker support with docker-compose configuration
- Database backup and migration tools
- Swagger UI for interactive API documentation
- Support for text and image encryption
- Item extend functionality for re-encryption

---

**Note**: This changelog was created retroactively based on git history. Future releases will maintain detailed changelogs from the start.
