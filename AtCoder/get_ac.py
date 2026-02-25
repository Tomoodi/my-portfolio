import requests
import json

# --- ここを自分の ID に書き換えてください ---
USER_ID = "ondindin" 
# ------------------------------------------

SUBMISSIONS_API = f"https://kenkoooo.com/atcoder/atcoder-api/v3/user/submissions?user={USER_ID}&from_second=0"
PROBLEMS_API = "https://kenkoooo.com/atcoder/resources/problems.json"

def update_data():
    print(f"AtCoder から {USER_ID} さんのデータを取得中...")
    try:
        # 1. 自分の提出データを取得
        res_sub = requests.get(SUBMISSIONS_API)
        res_sub.raise_for_status()
        ac_ids = list({s['problem_id'] for s in res_sub.json() if s['result'] == 'AC'})
        
        # 2. 全問題のデータを取得
        res_prob = requests.get(PROBLEMS_API)
        res_prob.raise_for_status()
        all_probs = res_prob.json()
        
        # ABCの問題だけを抽出して整理
        abc_data = {}
        for p in all_probs:
            p_id = p['id']
            if p_id.startswith('abc'):
                contest_id = p['contest_id']
                if contest_id not in abc_data:
                    abc_data[contest_id] = []
                abc_data[contest_id].append(p_id)

        # 【重要】ここで output という名前の箱にデータをまとめます
        output = {
            "ac_list": ac_ids,
            "contests": abc_data
        }
        
        # 3. JSONファイルとして保存
        with open("atcoder_data.json", "w", encoding="utf-8") as f:
            json.dump(output, f, indent=2, ensure_ascii=False)
        
        print(f"成功！ {len(abc_data)} コンテスト分のデータを 'atcoder_data.json' に保存しました。")

    except Exception as e:
        print(f"エラーが発生しました: {e}")

if __name__ == "__main__":
    update_data()
