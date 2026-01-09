import { getStorageClient } from './index';

/**
 * 批次為專案中的所有任務產生 Embedding
 */
export async function batchEmbedTasks(projectId: string) {
    const storage = getStorageClient();

    console.log('🚀 開始批次向量化任務...');

    // 取得所有任務
    const { data: items, error: fetchError } = await storage.getItems(projectId);

    if (fetchError || !items || items.length === 0) {
        console.log('✅ 沒有需要處理的任務');
        return { successCount: 0, failCount: 0, total: 0 };
    }

    let successCount = 0;
    let failCount = 0;
    const total = items.length;

    for (const item of items) {
        try {
            const { error } = await storage.embedTask(
                item.id,
                item.title,
                item.description || '',
                item.project_id
            );

            if (!error) {
                successCount++;
                console.log(`✅ [${successCount}/${total}] ${item.title}`);
            } else {
                failCount++;
                console.error(`❌ Failed: ${item.title}`, error);
            }

            // 避免 API Rate Limit，每次請求間隔 100ms
            await new Promise(resolve => setTimeout(resolve, 100));

        } catch (err) {
            failCount++;
            console.error(`❌ Exception for ${item.title}:`, err);
        }
    }

    console.log(`\n📊 批次處理完成：`);
    console.log(`   ✅ 成功: ${successCount}`);
    console.log(`   ❌ 失敗: ${failCount}`);
    console.log(`   📌 總計: ${total}`);

    return { successCount, failCount, total };
}
