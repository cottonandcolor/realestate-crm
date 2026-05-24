export function leadAssignedEmail(params: {
  agentName: string;
  leadName: string;
  leadEmail?: string;
  leadPhone?: string;
}) {
  return {
    subject: `New lead assigned: ${params.leadName}`,
    html: `
      <h2>You have a new lead</h2>
      <p>Hi ${params.agentName},</p>
      <p><strong>${params.leadName}</strong> has been assigned to you.</p>
      <ul>
        ${params.leadEmail ? `<li>Email: ${params.leadEmail}</li>` : ""}
        ${params.leadPhone ? `<li>Phone: ${params.leadPhone}</li>` : ""}
      </ul>
      <p>Log in to your CRM to follow up.</p>
    `,
  };
}

export function showingReminderEmail(params: {
  agentName: string;
  title: string;
  when: string;
  location?: string;
}) {
  return {
    subject: `Showing reminder: ${params.title}`,
    html: `
      <h2>Upcoming showing</h2>
      <p>Hi ${params.agentName},</p>
      <p><strong>${params.title}</strong></p>
      <p>When: ${params.when}</p>
      ${params.location ? `<p>Location: ${params.location}</p>` : ""}
    `,
  };
}
