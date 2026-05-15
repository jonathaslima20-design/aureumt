/*
  # Allow anonymous users to view active plans

  1. Security Changes
    - Add SELECT policy on `plans` table for the `anon` role
    - Only exposes rows where `is_active = true`
    - Plans are public pricing information displayed on the landing page

  2. Notes
    - The existing "Authenticated users can view active plans" policy remains unchanged
    - This new policy ensures unauthenticated landing page visitors can see pricing
*/

CREATE POLICY "Anyone can view active plans"
  ON plans
  FOR SELECT
  TO anon
  USING (is_active = true);
