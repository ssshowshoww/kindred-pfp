# Kindred‑style PFP Studio

- Base 이미지를 원형으로 **가득 채워서** 배치
- Sticker(모자/안경/기타) **이동/회전/스케일** 가능
- Ring(프레임)은 **기본 고정** + 버튼으로 **보이기/숨기기/잠금해제/다시잠그기**
- PNG(500×500)로 다운로드

## 파일 구조
```
index.html
style.css
app.js
ring.png              # 링 이미지 (바꾸려면 이 파일 교체)
stickers/
  fedora.png
  glasses.png
  brooch.png
  mask.png
  tie.png
  bow.png
```

> 스티커/링 이미지는 저장소에 포함된 **플레이스홀더**입니다. 실제 파일로 교체하세요.

## 로컬 실행
서버로 열어야 합니다(더블클릭 X).

- VS Code → Live Server
- Python 내장 서버:
  ```bash
  python -m http.server 5173
  # 브라우저 http://localhost:5173
  ```
