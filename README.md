# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## Development Admin Credentials (local/dev only)

The project includes a helper script to create a seeded admin user in your Supabase project for local development.

- Sample dev admin (not for production):
	- Email: admin@local.test
	- Password: Admin123!

If you have Supabase service credentials available in your environment, you can create the admin user by running:

```bash
# Set these as environment variables (do NOT check service keys into git)
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_KEY="<your-service-role-key>"
export ADMIN_EMAIL="admin@local.test"
export ADMIN_PASSWORD="Admin123!"
# Optional: ADMIN_NAME
node scripts/setup-admin.js
```

Notes:
- `scripts/setup-admin.js` uses the Supabase Admin API to create the auth user and attempts to insert a `user_roles` row with the `admin` role. If the `user_roles` table does not exist in your database, the script will print the SQL you can run in the Supabase SQL editor to create it and assign the admin role.
- Do not commit your Supabase service key or real credentials into the repository. Only use the helper script locally with secure environment variables.
