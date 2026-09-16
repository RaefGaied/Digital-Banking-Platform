import smtplib
from email.mime.text import MIMEText
import os

def send_from_agent(agent_email, customer_email, subject, body):

    EMAIL_PASS = os.getenv("EMAIL_PASS")
    CUSTOMER_EMAIL = customer_email

    try:
        msg = MIMEText(body)
        msg["Subject"] = subject
        msg["From"] = agent_email
        msg["To"] = CUSTOMER_EMAIL

        server = smtplib.SMTP_SSL("smtp.gmail.com", 465)
        server.login(agent_email, EMAIL_PASS)
        server.sendmail(agent_email, CUSTOMER_EMAIL, msg.as_string())
        server.quit()

    except Exception as e:
        print("EMAIL ERROR:", e)