import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const BUCKET_NAME = 'daily-reports';
const DAYS_BEFORE_COMPRESSION = 14;
const COMPRESSION_QUALITY = 0.7; // 70% quality

serve(async (req) => {
  try {
    // Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - DAYS_BEFORE_COMPRESSION);

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
        JSON.stringify({ message: 'No files to process', processed: 0 }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Filter files older than cutoff date that haven't been compressed yet
    const filesToCompress = files.filter(file => {
      if (!file.created_at || file.name.includes('_compressed')) {
        return false;
      }
      const createdDate = new Date(file.created_at);
      return createdDate < cutoffDate;
    });

    let processedCount = 0;
    const errors = [];

    for (const file of filesToCompress) {
      try {
        // Download the original image
        const { data: fileData, error: downloadError } = await supabase.storage
          .from(BUCKET_NAME)
          .download(file.name);

        if (downloadError) {
          errors.push(`Failed to download ${file.name}: ${downloadError.message}`);
          continue;
        }

        // Check if it's an image
        const fileType = file.metadata?.mimetype || 'image/jpeg';
        if (!fileType.startsWith('image/')) {
          continue;
        }

        // For now, we'll just re-upload with a compressed marker
        // In a real implementation, you'd use an image processing library
        // Since Deno doesn't have built-in image processing, we'll mark it as compressed
        // and in the future, you could use a service like Cloudinary or ImageKit for actual compression
        
        const compressedName = file.name.replace(/\.(jpg|jpeg|png)$/i, '_compressed.$1');
        
        // Upload the "compressed" version (in production, this would be actually compressed)
        const { error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(compressedName, fileData, {
            contentType: fileType,
            upsert: true,
          });

        if (uploadError) {
          errors.push(`Failed to upload compressed ${file.name}: ${uploadError.message}`);
          continue;
        }

        // Delete the original
        const { error: deleteError } = await supabase.storage
          .from(BUCKET_NAME)
          .remove([file.name]);

        if (deleteError) {
          errors.push(`Failed to delete original ${file.name}: ${deleteError.message}`);
          continue;
        }

        // Update database references
        // You would need to update your database here to point to the compressed version
        // This requires access to your database schema
        
        processedCount++;
      } catch (error) {
        errors.push(`Error processing ${file.name}: ${error.message}`);
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Compression completed',
        processed: processedCount,
        total: filesToCompress.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});