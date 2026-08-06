import {
    db,
    collection,
    addDoc,
    query,
    orderBy,
    limit,
    getDocs
} from "../../../firebase";


export async function saveRanking(
    name:string,
    time:number
)
{
    await addDoc(
        collection(db,"anpanman-shooting-ranking"),
        {
            name:name,
            time:time
        }
    );
}

export async function getRanking() {
    const q = query(
        collection(db, "anpanman-shooting-ranking"),
        orderBy("time", "asc"),
        limit(10)
    );

    const snapshot = await getDocs(q);

    const ranking: any[] = [];

    snapshot.forEach((doc)=>{

        ranking.push(doc.data());
    });
    return ranking;
}