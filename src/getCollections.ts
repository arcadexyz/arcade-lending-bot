import dotenv from 'dotenv';
import fs from 'fs';
import { arcadeApiRequest } from './arcadeapi';

dotenv.config();

interface Collection {
    id: string;
    name: string;
    isVerified: boolean;
}

async function getAndStoreCollections(): Promise<void> {
    try {
        const collections = await arcadeApiRequest('GET', 'collections') as Collection[];
        
        if (!collections || collections.length === 0) {
            return;
        }

        const filteredCollections = collections
            .filter(collection => collection.isVerified)
            .map(({ id, name }) => ({ id, name }));

        const timestamp = new Date().toISOString().replace(/:/g, '-');
        const fileName = `collections_data_${timestamp}.json`;
        fs.writeFileSync(fileName, JSON.stringify(filteredCollections, null, 2));

        console.log(`Collections data stored in ${fileName}`);
    } catch (error) {
        console.error('Error in getAndStoreCollections:', error);
    }
}

export function getStoredCollections(): { id: string; name: string }[] {
    const files = fs.readdirSync('.');
    const collectionFiles = files.filter(file => file.startsWith('collections_data_') && file.endsWith('.json'));
    
    if (collectionFiles.length === 0) {
        return [];
    }

    const mostRecentFile = collectionFiles.sort().reverse()[0];
    const data = fs.readFileSync(mostRecentFile, 'utf8');
    return JSON.parse(data);
}

export function getCollectionNameById(id: string): string | undefined {
    const collections = getStoredCollections();
    const collection = collections.find(c => c.id === id);
    return collection?.name;
}

getAndStoreCollections().catch(error => {
    console.error('Unhandled error in getAndStoreCollections:', error);
});