import fetch from 'node-fetch';

export async function getHighestBid(collectionAddress: string): Promise<number | null> {
    const options = {
        method: 'GET',
        headers: { accept: '*/*', 'x-api-key': process.env.RESERVOIR_API || '' }
    };

    try {
        const response = await fetch(`https://api.reservoir.tools/oracle/collections/top-bid/v3?collection=${collectionAddress}`, options);
        const data = await response.json();
        return data && typeof data.price === 'number' ? data.price : null;
    } catch (error) {
        console.error('Error fetching highest bid:', error);
        return null;
    }
}

export async function getFloorPrice(collectionAddress: string): Promise<number | null> {
    const options = {
        method: 'GET',
        headers: { accept: '*/*', 'x-api-key': process.env.RESERVOIR_API || '' }
    };

    try {
        const response = await fetch(`https://api.reservoir.tools/oracle/collections/floor-ask/v6?collection=${collectionAddress}`, options);
        const data = await response.json();
        return data && typeof data.price === 'number' ? data.price : null;
    } catch (error) {
        console.error('Error fetching floor price:', error);
        return null;
    }
}