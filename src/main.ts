import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

// Firestoreエミュレータの設定
process.env.FIRESTORE_EMULATOR_HOST = "localhost:8080";

const projectId = process.env.FIREBASE_PROJECT_ID || "dummy-project-id";

// Firebase Admin SDKの初期化
initializeApp({
  projectId: projectId,
});

// Firestoreインスタンスを取得
const db = getFirestore();

// ユーザーインターフェース
interface User {
  id: string;
  name: string;
  is_active: boolean;
  last_updated: Timestamp;
}

// 時刻付きでログを出力する関数
function logWithTimestamp(message: string): void {
  const now = new Date();
  const timestamp = now.toLocaleTimeString("ja-JP");
  console.log(`[${timestamp}] ${message}`);
}
async function createUser(
  id: string,
  name: string,
  isActive: boolean
): Promise<void> {
  const user: User = {
    id,
    name,
    is_active: isActive,
    last_updated: Timestamp.now(),
  };

  try {
    await db.collection("users").doc(id).set(user);
    logWithTimestamp(`ユーザー ${name} を作成しました`);
  } catch (error) {
    logWithTimestamp(`ユーザー ${name} の作成に失敗しました: ${error}`);
  }
}

// ユーザーのアクティブ状態を更新する関数
async function updateUserActiveStatus(
  userId: string,
  isActive: boolean
): Promise<void> {
  try {
    await db.collection("users").doc(userId).update({
      is_active: isActive,
      last_updated: Timestamp.now(),
    });
    logWithTimestamp(
      `ユーザー ${userId} の状態を ${
        isActive ? "オンライン" : "オフライン"
      } に更新しました`
    );
  } catch (error) {
    logWithTimestamp(`ユーザー ${userId} の状態更新に失敗しました: ${error}`);
  }
}

// ユーザーが他のユーザーを監視する関数
function monitorUsers(userId: string): () => void {
  logWithTimestamp(`ユーザー ${userId} が他のユーザーの監視を開始します`);

  const unsubscribe = db.collection("users").onSnapshot(
    (snapshot) => {
      logWithTimestamp(`ユーザー ${userId} が変更を検出しました`);

      snapshot.docChanges().forEach((change) => {
        if (change.type === "modified") {
          const userData = change.doc.data() as User;
          logWithTimestamp(
            `ユーザー ${userId} が検出: ${userData.name} が ${
              userData.is_active ? "オンライン" : "オフライン"
            } になりました`
          );
        }
      });

      // 変更があった場合、全データを再度読み取る
      snapshot.forEach((doc) => {
        const userData = doc.data() as User;
        logWithTimestamp(
          `ユーザー ${userId} が読み取り: ${userData.name} は ${
            userData.is_active ? "オンライン" : "オフライン"
          } です`
        );
      });
    },
    (error) => {
      logWithTimestamp(
        `ユーザー ${userId} の監視中にエラーが発生しました: ${error}`
      );
    }
  );

  return unsubscribe;
}

// ユーザーの状態を定期的に切り替える関数
function toggleUserStatus(
  userId: string,
  intervalSeconds: number
): NodeJS.Timeout {
  return setInterval(async () => {
    // 現在の状態を取得
    const userDoc = await db.collection("users").doc(userId).get();
    const userData = userDoc.data() as User;

    // 状態を反転
    const newStatus = !userData.is_active;
    await updateUserActiveStatus(userId, newStatus);
  }, intervalSeconds * 1000);
}

// メイン関数
async function main() {
  try {
    // コレクションを初期化（すでに存在する場合はクリア）
    const usersCollection = await db.collection("users").get();
    const batch = db.batch();
    usersCollection.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();
    logWithTimestamp("usersコレクションを初期化しました");

    // ユーザーを作成
    await createUser("userA", "ユーザーA", true);
    await createUser("userB", "ユーザーB", false);
    await createUser("userC", "ユーザーC", true);

    // 各ユーザーが他のユーザーを監視開始
    const unsubscribeA = monitorUsers("userA");
    const unsubscribeB = monitorUsers("userB");
    const unsubscribeC = monitorUsers("userC");

    // 各ユーザーが状態を定期的に変更
    const intervalA = toggleUserStatus("userA", 2); // 2秒ごと
    const intervalB = toggleUserStatus("userB", 3); // 3秒ごと
    const intervalC = toggleUserStatus("userC", 5); // 5秒ごと

    // 10秒後にプログラムを終了
    setTimeout(async () => {
      // 監視を停止
      unsubscribeA();
      unsubscribeB();
      unsubscribeC();

      // インターバルをクリア
      clearInterval(intervalA);
      clearInterval(intervalB);
      clearInterval(intervalC);

      logWithTimestamp("10秒経過しました。プログラムを終了します。");

      // 読み取り回数などの統計情報があれば表示（エミュレータのログで確認する必要があります）
      logWithTimestamp(
        "Firestoreエミュレータのログで読み取り回数を確認してください。"
      );

      process.exit(0);
    }, 10000);
  } catch (error) {
    logWithTimestamp(`エラーが発生しました: ${error}`);
    process.exit(1);
  }
}

// プログラムを実行
main();
