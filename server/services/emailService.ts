import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendEmail = async (to: string, subject: string, html: string) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('Email credentials not configured. Skipping email send.');
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"SupplyPay" <noreply@supplypay.com>',
      to,
      subject,
      html,
    });
    console.log('Email sent: %s', info.messageId);
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

export const emailTemplates = {
  registration: (name: string) => ({
    subject: 'Bem-vindo ao SupplyPay!',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #10b981;">Olá, ${name}!</h2>
        <p>Obrigado por se cadastrar no <strong>SupplyPay</strong>. Sua conta foi criada com sucesso e está aguardando aprovação administrativa.</p>
        <p>Você receberá um novo e-mail assim que seu perfil for aprovado.</p>
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
          Este é um e-mail automático, por favor não responda.
        </div>
      </div>
    `,
  }),
  approval: (name: string) => ({
    subject: 'Seu perfil foi aprovado no SupplyPay!',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #10b981;">Parabéns, ${name}!</h2>
        <p>Seu perfil no <strong>SupplyPay</strong> foi aprovado. Agora você já pode acessar todas as funcionalidades da plataforma.</p>
        <p><a href="${process.env.APP_URL}" style="display: inline-block; padding: 10px 20px; background-color: #10b981; color: white; text-decoration: none; border-radius: 5px;">Acessar Painel</a></p>
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
          Este é um e-mail automático, por favor não responda.
        </div>
      </div>
    `,
  }),
  transactionConfirmed: (name: string, amount: number, transactionId: string) => ({
    subject: 'Transação Confirmada - SupplyPay',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #10b981;">Transação Confirmada</h2>
        <p>Olá, ${name}. Sua transação de <strong>R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> foi confirmada com sucesso.</p>
        <p><strong>ID da Transação:</strong> ${transactionId}</p>
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
          Este é um e-mail automático, por favor não responda.
        </div>
      </div>
    `,
  }),
  passwordReset: (name: string, resetLink: string) => ({
    subject: 'Recuperação de Senha - SupplyPay',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #10b981;">Recuperação de Senha</h2>
        <p>Olá, ${name}. Recebemos uma solicitação para redefinir sua senha no <strong>SupplyPay</strong>.</p>
        <p>Clique no botão abaixo para criar uma nova senha:</p>
        <p><a href="${resetLink}" style="display: inline-block; padding: 10px 20px; background-color: #10b981; color: white; text-decoration: none; border-radius: 5px;">Redefinir Senha</a></p>
        <p>Se você não solicitou isso, pode ignorar este e-mail.</p>
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
          Este é um e-mail automático, por favor não responda.
        </div>
      </div>
    `,
  }),
  operationRequest: (name: string, operatorName: string, amount: number, fee: number) => ({
    subject: 'Nova Solicitação de Operação - SupplyPay',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #10b981;">Nova Solicitação de Operação</h2>
        <p>Olá, ${name}. Você recebeu uma nova solicitação de operação no <strong>SupplyPay</strong>.</p>
        <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Operador:</strong> ${operatorName}</p>
          <p><strong>Valor da Operação:</strong> R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          <p><strong>Sua Taxa:</strong> R$ ${fee.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <p>Acesse o painel para aceitar ou recusar a solicitação.</p>
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
          Este é um e-mail automático, por favor não responda.
        </div>
      </div>
    `,
  }),
  statusActive: (name: string) => ({
    subject: 'Você está Online no SupplyPay!',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #10b981;">Olá, ${name}!</h2>
        <p>Seu status no <strong>SupplyPay</strong> foi alterado para <strong>DISPONÍVEL</strong>.</p>
        <p>Agora você está visível para os operadores e pronto para receber novas solicitações de operação.</p>
        <p>Mantenha-se atento às notificações no seu painel!</p>
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
          Este é um e-mail automático, por favor não responda.
        </div>
      </div>
    `,
  }),
  withdrawalRequest: (name: string, amount: number) => ({
    subject: 'Nova Solicitação de Saque - SupplyPay',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #10b981;">Nova Solicitação de Saque</h2>
        <p>Olá, ${name}. Sua solicitação de saque de <strong>R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> foi recebida e está sendo processada.</p>
        <p>O prazo para conclusão é de até 24 horas úteis.</p>
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
          Este é um e-mail automático, por favor não responda.
        </div>
      </div>
    `,
  }),
  withdrawalCompleted: (name: string, amount: number) => ({
    subject: 'Saque Concluído - SupplyPay',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #10b981;">Saque Concluído</h2>
        <p>Olá, ${name}. Seu saque de <strong>R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> foi processado e enviado para sua conta cadastrada.</p>
        <p>Obrigado por usar o <strong>SupplyPay</strong>!</p>
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
          Este é um e-mail automático, por favor não responda.
        </div>
      </div>
    `,
  }),
  withdrawalRejected: (name: string, amount: number, reason: string) => ({
    subject: 'Saque Recusado - SupplyPay',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #ef4444;">Saque Recusado</h2>
        <p>Olá, ${name}. Sua solicitação de saque de <strong>R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> foi recusada.</p>
        <p><strong>Motivo:</strong> ${reason}</p>
        <p>Por favor, entre em contato com o suporte para mais informações.</p>
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
          Este é um e-mail automático, por favor não responda.
        </div>
      </div>
    `,
  }),
  newMessage: (name: string, senderName: string, message: string) => ({
    subject: 'Nova Mensagem no Chat - SupplyPay',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #10b981;">Nova Mensagem</h2>
        <p>Olá, ${name}. Você recebeu uma nova mensagem de <strong>${senderName}</strong> no chat do <strong>SupplyPay</strong>.</p>
        <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; font-style: italic;">
          "${message}"
        </div>
        <p><a href="${process.env.APP_URL}" style="display: inline-block; padding: 10px 20px; background-color: #10b981; color: white; text-decoration: none; border-radius: 5px;">Responder no Chat</a></p>
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
          Este é um e-mail automático, por favor não responda.
        </div>
      </div>
    `,
  }),
  operationAccepted: (name: string, supplierName: string) => ({
    subject: 'Sua Solicitação de Operação foi Aceita! - SupplyPay',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #10b981;">Operação Aceita</h2>
        <p>Olá, ${name}. O fornecedor <strong>${supplierName}</strong> aceitou sua solicitação de operação.</p>
        <p>Acesse o painel para prosseguir com a operação.</p>
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
          Este é um e-mail automático, por favor não responda.
        </div>
      </div>
    `,
  }),
  operationRejected: (name: string, supplierName: string) => ({
    subject: 'Sua Solicitação de Operação foi Recusada - SupplyPay',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #ef4444;">Operação Recusada</h2>
        <p>Olá, ${name}. O fornecedor <strong>${supplierName}</strong> recusou sua solicitação de operação.</p>
        <p>Você pode tentar solicitar a outro fornecedor disponível.</p>
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
          Este é um e-mail automático, por favor não responda.
        </div>
      </div>
    `,
  }),
};
