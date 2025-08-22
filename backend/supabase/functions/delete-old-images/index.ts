import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const BUCKET_NAME = 'daily-reports';
const DAYS_BEFORE_DELETION = 30;

serve(async (req) => {
  try {
    // Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - DAYS_BEFORE_DELETION);

    console.log(`Deleting images older than: ${cutoffDate.toISOString()}`);

    // List all files in the bucket
    const { data: files, error: listError } = await supabase.storage
      .from(BUCKET_NAME)
      .list('', {
        limit: 1000,
        offset: 0,
      });

    if (listError) {
      throw new Error(`Failed to list files: ${listError.message}`);
    }

    if (!files || files.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No files to process', deleted: 0 }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Filter files older than cutoff date
    const filesToDelete = files.filter(file => {
      if (!file.created_at) {
        return false;
      }
      const createdDate = new Date(file.created_at);
      return createdDate < cutoffDate;
    });

    console.log(`Found ${filesToDelete.length} files to delete`);

    let deletedCount = 0;
    const errors = [];

    // Process deletion in batches
    const batchSize = 10;
    for (let i = 0; i < filesToDelete.length; i += batchSize) {
      const batch = filesToDelete.slice(i, i + batchSize);
      const fileNames = batch.map(file => file.name);

      try {
        const { error: deleteError } = await supabase.storage
          .from(BUCKET_NAME)
          .remove(fileNames);

        if (deleteError) {
          errors.push(`Failed to delete batch: ${deleteError.message}`);
        } else {
          deletedCount += fileNames.length;
          console.log(`Deleted batch of ${fileNames.length} files`);
        }
      } catch (error) {
        errors.push(`Error deleting batch: ${error.message}`);
      }
    }

    // Log summary
    console.log(`Deletion completed. Deleted: ${deletedCount}, Errors: ${errors.length}`);

    return new Response(
      JSON.stringify({
        message: 'Deletion completed',
        deleted: deletedCount,
        total: filesToDelete.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});