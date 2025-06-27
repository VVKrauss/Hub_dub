/*
  # Add function to get secrets
  
  1. Function
    - get_secret(secret_name) - returns secret value from vault
    
  2. Security  
    - Only authenticated users can call this function
    - Function uses service role to access vault
*/

-- Create function to get secrets from vault
CREATE OR REPLACE FUNCTION get_secret(secret_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    secret_value text;
BEGIN
    -- Only allow authenticated users
    IF auth.role() != 'authenticated' THEN
        RAISE EXCEPTION 'Access denied';
    END IF;
    
    -- Get secret from vault
    SELECT decrypted_secret 
    INTO secret_value
    FROM vault.decrypted_secrets 
    WHERE name = secret_name;
    
    -- Return the secret value
    RETURN secret_value;
EXCEPTION
    WHEN OTHERS THEN
        -- Don't expose error details for security
        RAISE EXCEPTION 'Secret not found or access denied';
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_secret(text) TO authenticated;