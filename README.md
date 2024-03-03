# Harmoni Edge Functions (and Database Schemas)

## Introduction
This repository contains all the Supabase Edge functions. 
These include functions to simplify iOS requests to the 
Supabase database and storage, as well as Edge functions to 
coordinate between the database and Web 3.

This repository also contains the schemas and SQL code for 
setting up the database itself, since Supabase is right at the 
root and center of the Edge functions.

## Quick-Start Resources

Supabase - https://supabase.com/
Edge functions - https://supabase.com/edge-functions
TypeScript - https://www.typescriptlang.org/
Testing - https://supabase.com/docs/guides/cli/testing-and-linting
    (note: see the Test Helpers section and blog posts)

## Repository Structure

This repository follows the structure autogenerated
by the supabase development environment (see next section).
Key components of this repository include:

Configuration - supabase/config.toml
Edge functions - supabase/functions/
File storage (TODO) - supabase/storage/ (?)
Seed data - supabase/seed.sql
SQL tables/schemas - supabase/migrations/
Tests - supabase/tests/ (TODO: none written yet)


## Supabase Development Environment

Supabase offers a local development environment via containers,
as well as guidance for a workflow to deploy from this dev
environment to a non-local project.

To set up your machine, follow the instructions here:

https://supabase.com/docs/guides/cli/local-development

The key setup steps are:
- Install Docker Desktop (or equivalent) to support containers
- Install Supabase CLI
- From this folder, run "supabase start" to spin up
- Run "supabase db reset" to apply migrations and seed data changes

The reset should run all the existing SQL migration code, seed.sql, etc.
SQL migration code is used to create and modify the data tables.
The seed.sql file can instantiate data in those tables locally,
which is useful for running tests.

Once the dev environment is spun up, the CLI will list several URLs:
         API URL: http://127.0.0.1:54321
     GraphQL URL: http://127.0.0.1:54321/graphql/v1
          DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
      Studio URL: http://127.0.0.1:54323
    Inbucket URL: http://127.0.0.1:54324

Along with some secrets and tokens.

The Studio URL (http://127.0.0.1:54323) will bring you to the Dashboard
where you can explore and manually manipulate the data.

## Potential Deployment Workflow
TODO: set up production workflow to non-local db (later?)
To push local dev-stage changes to the non-local Harmoni project,
first log in from the terminal via

supabase login

Then push database migrations to the non-local project via

supabase db push

And deploy edge functions via

supabase functions deploy <function-here>

Note, the push is for migrations and changes and does not include seed data.
This avoids unintentional changes to production data.


