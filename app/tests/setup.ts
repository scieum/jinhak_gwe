import { configure } from '@testing-library/react';

// findBy · waitFor 기본 대기 1초는 전체 실행 부하에서 모자라요(통과 조건은 그대로, 기다리는 시간만 늘려요).
configure({ asyncUtilTimeout: 5000 });
