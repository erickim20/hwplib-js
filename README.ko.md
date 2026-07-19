# hwplib-js

[English](README.md) · **한국어**

**HWP**(한글 워드프로세서, `.hwp` v5) 파일을 읽고 쓰는 아이소모픽(isomorphic) TypeScript 엔진입니다.
네이티브 애드온 없이 순수 JS 코드 하나로 **브라우저**, **Electron**, **Node**에서 그대로 동작합니다.
입력도 출력도 `Uint8Array`입니다.

> **이 프로젝트는 [neolord0](https://github.com/neolord0)님의
> [`hwplib`](https://github.com/neolord0/hwplib)를 JavaScript/TypeScript로 이식(port)한 것입니다** —
> **hwplib 1.1.10**(Apache-2.0)을 구조 그대로 충실히 옮겼습니다. 객체 모델, 리더(reader),
> 라이터(writer), `BlankFileMaker`를 원본 Java에서 1:1로 이식했습니다. 원본이 OLE2/CFB 컨테이너와
> DEFLATE 처리를 위해 Apache POI를 포함하는 부분은, 이 이식판에서는
> [`cfb`](https://github.com/SheetJS/js-cfb)와 [`fflate`](https://github.com/101arrowz/fflate)에
> 위임합니다. 전체 저작자 표시는 [`NOTICE`](NOTICE)를 참고하세요.

> 본 제품은 한글과컴퓨터의 HWP 문서 파일(.hwp) 공개 문서를 참고하여 개발하였습니다.

## 설치

```bash
npm install hwplib-js
```

## 사용법

```ts
import { HWPReader, HWPWriter, BlankFileMaker } from "hwplib-js";

const file = HWPReader.fromBytes(bytes);      // .hwp 파싱 (Uint8Array)
const text = file
  .getBodyText()
  .getSectionList()[0]
  .getParagraphs()
  .map((p) => p.getNormalString() ?? "")
  .join("\n");

const out = HWPWriter.toBytes(file);          // 다시 .hwp 바이트로 직렬화
const blank = BlankFileMaker.make();          // 유효한 빈 문서 생성

// 서브패스 임포트는 원본 Java 패키지 경로를 그대로 따릅니다:
import { Alignment } from "hwplib-js/object/docinfo/parashape/Alignment";
```

엔진은 오직 `Uint8Array`만 다루며 `fs`, `File`, DOM을 전혀 건드리지 않으므로 동일한 빌드가 어디서든
동작합니다. 파일 선택창, `fs`, HTML 파싱, 이미지 크기 계산처럼 환경에 종속적인 부분은 앱 가장자리의
얇은 어댑터에 두세요.

## 상태

Java hwplib 대비 검증을 마쳤습니다. 실제 `.hwp` 파일을 골든 라운드트립(golden round-trip) 수준으로
읽고 쓰며, `BlankFileMaker`로 문서를 처음부터 생성합니다. 이 저장소의 공개 테스트 스위트는 바이너리
프리미티브, 객체 모델, CFB 컨테이너, 그리고 자체 생성 문서에 대한 "읽기 → 쓰기 → 다시 읽기"
라운드트립을 검증합니다.

## 개발

```bash
npm install
npm run build       # tsc(구조 보존) + esbuild 미니파이 → dist/
npm run typecheck
npm test            # vitest
```

프로덕션 빌드는 `tsc`로 디렉터리 구조를 보존하며 컴파일한 뒤(그래서 `hwplib-js/*` 서브패스 export가
계속 동작합니다), 각 파일을 제자리에서 미니파이합니다.

## hwplib과의 관계

`hwplib-js`는 동작과 파일 호환성이 원본 구현과 일치하도록 공개
[`hwplib`](https://github.com/neolord0/hwplib) 객체 모델을 최대한 가깝게 따릅니다. 다만 상위 Java
프로젝트와는 별개로 관리되는 독립 이식판입니다. 이 이식판에 대한 이슈나 PR은 상위 프로젝트가 아니라
이 저장소에 남겨 주세요.

## 라이선스

[Apache-2.0](LICENSE) — hwplib(Apache-2.0)의 2차적 저작물입니다. [`NOTICE`](NOTICE)를 참고하세요.
