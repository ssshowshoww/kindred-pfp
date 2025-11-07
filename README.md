# Kindred — PFP & Sticker Studio

간단한 웹 기반 에디터로 트위터 PFP(프로필 이미지)와 스티커 PNG를 만들 수 있습니다.

## 기능
- **PFP / Sticker 모드 전환**
- **베이스 이미지 업로드/삭제**
- **링(frame) 토글**: 생성/삭제만 가능 (크기/이동/회전 불가)
- **악세서리 추가**: `bow`, `brooch`, `fedora`, `glasses`, `mask`, `tie` (자유롭게 이동/회전/크기 조절)
- **PNG (투명 배경) / JPG (흰 배경) 내보내기**
- 캔버스 크기: 500×500

## 설치 (GitHub에 바로 올리기)
1. 이 폴더 전체를 GitHub 리포지토리에 커밋하세요.
2. `assets/accessories` 폴더에 다음 PNG 파일을 넣으세요.
   - `bow.png`, `brooch.png`, `fedora.png`, `glasses.png`, `mask.png`, `tie.png`
3. (선택) `assets/base/ring.png`를 넣으면 해당 이미지를 링으로 사용합니다. 없다면 기본 벡터 링이 생성됩니다.
4. GitHub Pages 또는 Vercel에 배포하면 바로 동작합니다.

## 개발 메모
- 이미지 조작은 Fabric.js를 사용합니다(CDN).
- 링은 `selectable:false`, `evented:false` 상태로 잠겨 있으며, 전용 버튼으로만 생성/삭제할 수 있습니다.
- 베이스 이미지는 항상 가장 아래 레이어로 유지합니다.

## 라이선스
MIT
