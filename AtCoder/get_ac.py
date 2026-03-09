import requests
import json
import time

USER_ID = "ondindin" 

# unix時間（秒）を取得して、APIがキャッシュを返さないように工夫します
now = int(time.time())
# from_second を 0 にするのではなく、少し工夫したAPIを使用します
SUBMISSIONS_API = f"https://kenkoooo.com/atcoder/atcoder-api/v3/user/submissions?user={USER_ID}&from_second=0"
PROBLEMS_API = "https://kenkoooo.com/atcoder/resources/problems.json"

def update_data():
    print(f"AtCoder から {USER_ID} さんのデータを取得中...")
    try:
        # 1. 提出データを取得
        # ヘッダーに Cache-Control を追加して最新データをお願いする
        res_sub = requests.get(SUBMISSIONS_API, headers={"Cache-Control": "no-cache"})
        res_sub.raise_for_status()
        submissions = res_sub.json()
        
        # ACした問題IDを抽出（最新順に並び替える工夫）
        ac_ids = list({s['problem_id'] for s in submissions if s['result'] == 'AC'})
        
        print(f"現在の総AC数: {len(ac_ids)}")

        # 2. 全問題のデータを取得
        res_prob = requests.get(PROBLEMS_API)
        res_prob.raise_for_status()
        all_probs = res_prob.json()
        
        abc_data = {}
        for p in all_probs:
            p_id = p['id']
            if p_id.startswith('abc'):
                contest_id = p['contest_id']
                if contest_id not in abc_data:
                    abc_data[contest_id] = []
                abc_data[contest_id].append(p_id)

        output = {
            "ac_list": ac_ids,
            "contests": abc_data
        }
        
        # 3. JSONファイルとして保存（保存先を AtCoder/ フォルダに固定する）
        # GitHub Actionsで実行される際、確実に正しいファイルを上書きするようにします
        import os
        file_path = "AtCoder/atcoder_data.json"
        
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(output, f, indent=2, ensure_ascii=False)
        
        print(f"成功！ {len(abc_data)} コンテスト分のデータを '{file_path}' に保存しました。")

    except Exception as e:
        print(f"エラーが発生しました: {e}")

if __name__ == "__main__":
    update_data()