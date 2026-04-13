# staff/services/marks_calculation.py

def best_of_two(m1, m2, m3):
    values = [v for v in [m1, m2, m3] if v is not None]

    if len(values) == 0:
        return 0

    return sum(sorted(values, reverse=True)[:2]) / min(2, len(values))


def calculate_internal(m):
    subject = m.enrollment.subject
    scheme = subject.exam_scheme

    mids = [m.mid1, m.mid2, m.mid3]
    mids = [x for x in mids if x is not None]

    best_two = sorted(mids, reverse=True)[:2]
    mid_sum = sum(best_two)

    if scheme == "MID20":
        return mid_sum

    elif scheme == "MID15_AT4":
        ats = [m.at1, m.at2, m.at3, m.at4]
        ats = [x for x in ats if x is not None]

        ats_avg = sum(ats) / len(ats) if ats else 0
        return mid_sum + ats_avg

    elif scheme == "MID40":
        return mid_sum / 2 if mid_sum else 0

    else:
        return 0


def calculate_sgpa(subjects):
    total_points = 0
    total_credits = 0

    for sub in subjects:
        total_points += sub.grade_point * sub.credits
        total_credits += sub.credits

    return round(total_points / total_credits, 2) if total_credits else 0
