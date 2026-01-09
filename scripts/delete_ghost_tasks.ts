
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Manual .env parsing
const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env: Record<string, string> = {};

envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
        }
        env[key] = value;
    }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const targetTitles = [
    'CR: 權利盤點作業的存取權限與外部法律團隊介入',
    'CR: 新增審議會議管理功能於後台典藏系統',
    '決議內容：前台網站視覺設計決議'
];

async function findAndDeleteTasks() {
    console.log('Searching for tasks...');

    // 1. Find tasks by title (partial match)
    const tasksToDelete: any[] = [];

    for (const title of targetTitles) {
        console.log(`Searching for "${title}"...`);
        const { data, error } = await supabase
            .from('items')
            .select('id, title, status, type, created_at')
            .ilike('title', `%${title}%`);

        if (error) {
            console.error(`Error searching for "${title}":`, error);
            continue;
        }

        if (data && data.length > 0) {
            console.log(`Found match for "${title}":`, data);
            tasksToDelete.push(...data);
        } else {
            console.log(`No match found for "${title}"`);
        }
    }

    if (tasksToDelete.length === 0) {
        console.log('No tasks found to delete.');
        return;
    }

    console.log(`\nFound ${tasksToDelete.length} tasks to delete.`);

    // 2. Delete tasks
    console.log('Deleting tasks...');

    for (const task of tasksToDelete) {
        console.log(`Processing task: ${task.title} (${task.id})`);

        // Delete item_artifacts manually first just in case
        const { error: artifactError } = await supabase.from('item_artifacts').delete().eq('item_id', task.id);
        if (artifactError) console.warn('Artifact unlink warning:', artifactError.message);

        // Delete item
        const { error } = await supabase
            .from('items')
            .delete()
            .eq('id', task.id);

        if (error) {
            console.error(`Failed to delete task ${task.id} (${task.title}):`, error);
        } else {
            console.log(`Successfully deleted task: ${task.title} (${task.id})`);
        }
    }
}

findAndDeleteTasks();
