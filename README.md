# 웨라쌤 사이트 v2

이 버전은 GitHub Pages에서 동작하는 개인 포트폴리오 + 수업 기록 사이트입니다.

## 주요 기능
- 대문 이미지 / 폰트 / 색상 / 소개 문구 관리
- 강의 목록 추가·수정·삭제
- 수업 기록 작성·수정·삭제
- 대표 이미지 업로드
- 강의/수업 후기 관리
- `/admin/` 관리자 화면
- 별도 서버나 유료 데이터베이스 없이 GitHub 저장소에 직접 저장

## 설치
기존 `westlifetc.github.io` 저장소의 파일을 이 폴더 내용으로 교체합니다.
폴더 구조를 그대로 유지해야 합니다.

## 관리자
사이트 배포 후 `https://westlifetc.github.io/admin/` 로 접속합니다.

처음 한 번 GitHub Fine-grained personal access token이 필요합니다.
대상 저장소는 `westlifetc.github.io` 하나만 선택하고,
Repository permissions의 Contents 권한을 Read and write로 설정합니다.

관리자 페이지의 안내를 따라 토큰을 넣으면 이후 사이트 설정과 글쓰기를 관리자 화면에서 할 수 있습니다.

## 보안
관리자 토큰은 브라우저의 sessionStorage 또는 사용자가 선택한 경우 localStorage에만 저장됩니다.
공용 PC에서는 '이 브라우저에 기억하기'를 사용하지 마세요.
