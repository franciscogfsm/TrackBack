# Athlete Groups Feature Implementation

This update introduces a groups system where managers can organize their athletes into different groups, and athletes can only see leaderboards within their own group.

## What Was Changed

### 1. Database Schema Updates

- **New table**: `athlete_groups` - stores group information
- **Updated table**: `profiles` - added `group_id` column to link athletes to groups
- **Updated RLS policies**: Athletes can now only see other athletes in their same group

### 2. New Components

- **GroupsManagement.tsx**: Complete group management interface for managers
  - Create, edit, and delete groups
  - Assign/remove athletes to/from groups
  - Color-coded groups for better visualization

### 3. Updated Components

- **TeamPersonalBests.tsx**: Now shows only athletes from the same group
- **ManagerDashboard.tsx**: Added new "Groups" tab in athlete management section
- **database.types.ts**: Added `AthleteGroup` interface and updated `Profile` interface

## How to Apply the Changes

### Step 1: Database Migration

1. Open your Supabase Dashboard
2. Go to SQL Editor
3. Copy the content from `apply_groups_migration.sql`
4. Run the SQL query

### Step 2: Update Your Application

The TypeScript files have been updated with the new group functionality.

## How It Works

### For Managers

1. **Groups Management**: Access via Dashboard → Athletes → Groups tab

   - Create new groups with custom names, descriptions, and colors
   - Manage which athletes belong to which groups
   - View ungrouped athletes

2. **Athlete Assignment**:
   - Athletes can be in one group at a time
   - Athletes without groups will only see their own records
   - Moving athletes between groups is instant

### For Athletes

1. **Group-Based Leaderboards**:

   - Athletes only see leaderboards within their group
   - Header shows "Group Leaderboard" instead of "Team Leaderboard"
   - Points calculation remains the same but only within group

2. **No Group Behavior**:
   - Athletes not assigned to any group only see their own records
   - They won't see other athletes' data

## Features

- **Color-coded groups**: Each group has a customizable color for easy identification
- **Real-time updates**: Changes to groups reflect immediately in leaderboards
- **Mobile responsive**: All group management features work on mobile devices
- **Secure**: Row-level security ensures athletes can only see appropriate data

## Technical Details

### Database Structure

```sql
-- athlete_groups table
id (UUID, primary key)
manager_id (UUID, foreign key to profiles)
name (VARCHAR, group name)
description (TEXT, optional description)
color (VARCHAR, hex color code)
created_at, updated_at (timestamps)

-- profiles table addition
group_id (UUID, foreign key to athlete_groups)
```

### Security

- Managers can only manage their own groups
- Athletes can only see their group information
- RLS policies enforce data isolation between groups

## Testing the Feature

1. **As a Manager**:

   - Go to Dashboard → Athletes → Groups
   - Create a test group
   - Assign some athletes to the group
   - Check that ungrouped athletes appear separately

2. **As an Athlete**:

   - Log in as an athlete assigned to a group
   - Check the leaderboard shows only group members
   - Verify personal bests section works correctly

3. **Edge Cases**:
   - Athletes with no group should only see their own data
   - Deleting a group should unassign all athletes
   - Changing group assignment should update leaderboards immediately

This feature provides better organization for managers with large teams and ensures athletes only compete within their relevant peer groups.
