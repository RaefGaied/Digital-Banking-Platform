from ticket import create_ticket_api
import os

fail_counter = {}

def should_escalate(user_id, response):

    bad_signals = ["samajh nahi", "error", "failed"]

    if any(x in response.lower() for x in bad_signals):
        fail_counter[user_id] = fail_counter.get(user_id, 0) + 1
    else:
        fail_counter[user_id] = 0

    return fail_counter[user_id] >= 2


def escalate(user_id, token, query):

    res = create_ticket_api(token, query)

    ticket_id = res.get("ticketId") if res else "N/A"

    return f"""⚠️ Issue escalated

    🆔 Ticket ID: {ticket_id}
    Our support team will contact you soon.
    """