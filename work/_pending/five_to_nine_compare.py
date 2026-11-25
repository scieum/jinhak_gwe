"""5등급 평균 -> 9등급 환산 비교 (현재 공식 vs 대안 3종). 검토용, 앱 코드 아님."""
import math

C5 = [0, 10, 34, 66, 90, 100]                       # 5등급 누적 %
C9 = [0, 4, 11, 23, 40, 60, 77, 89, 96, 100]        # 9등급 누적 %


def interp(x, xs, ys):
    for i in range(len(xs) - 1):
        if x <= xs[i + 1] or i == len(xs) - 2:
            t = (x - xs[i]) / (xs[i + 1] - xs[i])
            return ys[i] + t * (ys[i + 1] - ys[i])


# 현재 공식: 등급 중앙 누적비 꺾은선
def current(r):
    p = interp(r, [1, 2, 3, 4, 5], [5, 22, 50, 78, 95])
    return interp(p, [2, 7.5, 17, 31.5, 50, 68.5, 83, 92.5, 98], list(range(1, 10)))


# ① 등급 경계 보간: g등급 = 연속값 [g-.5, g+.5] <-> 누적 [c(g-1), c(g)]
def pct_from5(r):
    return interp(r, [0.5 + i for i in range(6)], C5)


def nine_from_pct(p):
    return interp(p, C9, [0.5 + i for i in range(10)])


def boundary(r):
    return nine_from_pct(pct_from5(r))


# ② 균등분포 기댓값: 5등급 g 안에서 백분위 균등 -> 9등급 기댓값, 최소, 최대
def band_stats(g):
    lo, hi = C5[g - 1], C5[g]
    e, ks = 0.0, []
    for k in range(1, 10):
        ov = max(0, min(hi, C9[k]) - max(lo, C9[k - 1]))
        if ov > 0:
            e += k * ov
            ks.append(k)
    return e / (hi - lo), min(ks), max(ks)


BAND = {g: band_stats(g) for g in range(1, 6)}


def expected(r):
    g = min(int(math.floor(r)), 4)
    f = r - g
    a, b = BAND[g], BAND[g + 1]
    return tuple((1 - f) * a[i] + f * b[i] for i in range(3))


# ③ 전국 인원 기반 석차: 누적 인원 = round_half_up(N * 누적%)
def rhu(x):
    return int(math.floor(x + 0.5))


def cum_counts(n, cum):
    return [rhu(n * c / 100) for c in cum]


def rank_method(r, n5, n9):
    """5등급 평균 -> 백분위(① 방식) -> 대상 학년 석차 -> 기준 학년(n9) 같은 석차의 9등급."""
    rank = pct_from5(r) / 100 * n5
    p9 = rank / n9 * 100
    return nine_from_pct(min(p9, 100)), rank


def multi_subject(subjects):
    """subjects: [(5등급, 학점)] -> 평균, ②기댓값, 범위, 현재공식(평균 기준)"""
    tot = sum(c for _, c in subjects)
    avg = sum(g * c for g, c in subjects) / tot
    e = sum(BAND[g][0] * c for g, c in subjects) / tot
    mn = sum(BAND[g][1] * c for g, c in subjects) / tot
    mx = sum(BAND[g][2] * c for g, c in subjects) / tot
    return avg, e, mn, mx, current(avg)


if __name__ == "__main__":
    # 자기 점검
    assert abs(current(1.0) - 1.545) < 0.001 and abs(current(1.1) - 1.855) < 0.001
    assert abs(BAND[1][0] - 1.6) < 1e-9 and BAND[1][1:] == (1, 2)
    assert abs(rank_method(1.3, 400000, 400000)[0] - boundary(1.3)) < 1e-9  # 같은 N이면 ①과 동일

    # 학년별 인원(추정): 2026 교육기본통계 고교 1,279,392명을 출생 코호트 비로 배분
    births = {2006: 448153, 2007: 496822, 2008: 465892, 2009: 444849, 2010: 470171}
    totals = {2024: 1304325, 2025: 1299466, 2026: 1279392}
    est = {}
    for y, t in totals.items():
        coh = {f"고{k}": y - 16 - (k - 1) for k in (1, 2, 3)}  # 고1 = (y-16)년생
        s = sum(births[b] for b in coh.values())
        est[y] = {g: round(t * births[b] / s) for g, b in coh.items()}
        print(y, est[y], {g: b for g, b in coh.items()})

    print("\n5등급 1등급 실제 비율(소규모 수강자, 반올림)")
    for n in (5, 8, 10, 13, 15, 20, 25, 30, 50, 100, 200, 300):
        c5 = cum_counts(n, C5)
        c9 = cum_counts(n, C9)
        print(f"N={n:4d} 5등급 누적 {c5[1:5]} 1등급 {c5[1]/n*100:5.1f}% | 9등급 1등급 {c9[1]}명 {c9[1]/n*100:4.1f}%")

    N28 = est[2026]["고2"]   # 2009년생, 2028 대입
    N29 = est[2026]["고1"]   # 2010년생
    Nref = est[2025]["고3"]  # 2007년생, 2026학년도 입결(9등급)
    print("\nN 고2(2009생)", N28, "고1(2010생)", N29, "기준 고3 2025(2007생)", Nref)
    print("전국 누적 인원 5등급(2009생):", cum_counts(N28, C5))
    print("전국 누적 인원 9등급(2007생):", cum_counts(Nref, C9))

    print("\n| 5등급 평균 | 현재 | ① 경계 | ② 기댓값 (범위) | ③a 같은 N | ③b 석차(2009생→2007생 기준) | ③b 석차 |")
    for r in (1.0, 1.1, 1.2, 1.5, 2.0, 2.5, 3.0):
        e, mn, mx = expected(r)
        a, _ = rank_method(r, N28, N28)
        b, rank = rank_method(r, N28, Nref)
        print(f"| {r:.1f} | {current(r):.2f} | {boundary(r):.2f} | {e:.2f} ({mn:.2f}~{mx:.2f}) | {a:.2f} | {b:.2f} | {rank:,.0f}위 |")

    print("\n학점 가중 예시")
    cases = {
        "A 1등급 9과목 + 2등급 1과목(학점 같음)": [(1, 3)] * 9 + [(2, 3)],
        "B 1등급 8과목 + 2등급 2과목(2등급이 2학점 과목)": [(1, 3)] * 8 + [(2, 2)] * 2,
        "C 평균 1.5: 1·2등급 반반": [(1, 3)] * 5 + [(2, 3)] * 5,
        "D 평균 1.5: 1등급 3/4 + 3등급 1/4": [(1, 3)] * 6 + [(3, 3)] * 2,
        "E 평균 2.0: 전부 2등급": [(2, 3)] * 10,
        "F 평균 2.0: 1등급 반 + 3등급 반": [(1, 3)] * 5 + [(3, 3)] * 5,
    }
    for k, v in cases.items():
        avg, e, mn, mx, cur = multi_subject(v)
        print(f"{k}: 평균 {avg:.3f} | 현재 {cur:.2f} | ② {e:.2f} ({mn:.2f}~{mx:.2f})")
