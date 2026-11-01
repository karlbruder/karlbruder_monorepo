# Taxonomy

**Created**: 2026-11-01
**Last updated**: 2026-11-01

These names are the shared vocabulary for the rest of the specifications.

## Local and cloud

Local enviroment uses the development mode. The software runs on a laptop through `compose.yml`, with development servers with hot-reload and a local PostgreSQL container.

A cloud environment uses production builds and configuration. The software runs on an EC2 host through `compose.production.yml`, with built images, Nginx, and hosted Supabase.

Currently, there are two cloud environments, `dev` and `prod`. In the future, there will be more (eg. `uat`, `stg`).

| | `dev` | `prod` |
| --- | --- | --- |
| Landing names | `dev.karlbruder.com` | `karlbruder.com`, `prod.karlbruder.com` |
| Application names | `app-dev.karlbruder.com` | `app.karlbruder.com`, `app-prod.karlbruder.com` |

The two hosts differ by hostname, Elastic IP, instance size, image namespace, and the secrets on that host. They use the same Compose file.

## What production means

Production, used alone, means the `prod` cloud environment.

Say production mode or build when the sentence is about the cloud stack. Other cloud environments use that stack too.
