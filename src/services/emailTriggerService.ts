export const triggerEmail = async (type: 'registration' | 'approval' | 'transaction-confirmed' | 'password-reset' | 'operation-request' | 'status-active' | 'withdrawal-request' | 'withdrawal-completed' | 'withdrawal-rejected' | 'new-message' | 'operation-accepted' | 'operation-rejected', data: any) => {
  try {
    const response = await fetch(`/api/email/${type}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return await response.json();
  } catch (error) {
    console.error(`Error triggering ${type} email:`, error);
    return { success: false, error };
  }
};
