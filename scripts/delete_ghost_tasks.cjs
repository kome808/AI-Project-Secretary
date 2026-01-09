
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

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
    const tasksToDelete = [];

    for (const title of targetTitles) {
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
        // Delete item_artifacts manually first just in case
        await supabase.from('item_artifacts').delete().eq('item_id', task.id);

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
