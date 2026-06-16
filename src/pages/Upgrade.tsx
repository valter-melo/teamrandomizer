import { useEffect, useState } from 'react';
import {
  Card, Row, Col, Typography, Button, Spin, Tag, message, Tooltip
} from 'antd';
import {
  CrownOutlined,
  CheckCircleOutlined,
  ArrowRightOutlined,
  StarFilled,
  CheckOutlined,
  ArrowUpOutlined,
  LockOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { http } from '../api/http';
import { authStore } from '../auth/store';
import CpfCnpjModal from '../components/CpfCnpjModal';

const { Title, Text } = Typography;

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  maxPlayers: number;
  maxChampionships: number;
  features: string[];
  active: boolean;
}

export default function Upgrade() {
  const navigate = useNavigate();
  const auth = authStore.get();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [cpfModalOpen, setCpfModalOpen] = useState(false);

  const currentPlanName = auth.planName || 'Free';
  
  // Encontra o plano atual para comparação de preço
  const currentPlan = plans.find(p => p.name === currentPlanName);
  const currentPlanPrice = currentPlan?.price || 0;

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await http.get('/plans');
        const allPlans = res.data.filter((p: Plan) => p.active);
        setPlans(allPlans);
      } catch (error) {
        console.error('Erro ao carregar planos', error);
        message.error('Erro ao carregar planos');
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, []);

  // ─── Função que efetivamente cria a assinatura ───
  const proceedWithSubscription = async () => {
    setSubscribing(true);
    try {
      const res = await http.post('/checkout/subscribe', { planId: selectedPlan });
      const { bankSlipUrl, pixUrl, invoiceUrl } = res.data as {
        bankSlipUrl?: string;
        pixUrl?: string;
        invoiceUrl?: string;
      };

      // Abre o link de pagamento do Asaas (permite escolher boleto/PIX/cartão)
      if (invoiceUrl) {
        window.open(invoiceUrl, '_blank');
        message.success('Página de pagamento aberta! Escolha a forma de pagamento.');
      } else if (bankSlipUrl) {
        window.open(bankSlipUrl, '_blank');
        message.success('Boleto gerado!');
      }

      if (pixUrl && !invoiceUrl) {
        navigator.clipboard.writeText(pixUrl);
        message.success('Código PIX copiado!');
      }

      // Atualiza o authStore
      const plan = plans.find(p => p.id === selectedPlan);
      if (plan) {
        const current = authStore.get();
        authStore.set({ ...current, planName: plan.name, features: parseFeatures(plan.features) });
      }
      await authStore.syncPlan();

      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (error: any) {
      console.error('Erro ao assinar', error);
      message.error(error.response?.data?.message || 'Erro ao processar assinatura');
    } finally {
      setSubscribing(false);
    }
  };

  // ─── Handler principal do botão "Confirmar Upgrade" ───
  const handleSubscribe = async () => {
    if (!selectedPlan) {
      message.warning('Selecione um plano');
      return;
    }

    const plan = plans.find(p => p.id === selectedPlan);
    if (!plan) return;

    // Verifica se está tentando assinar o plano atual
    if (plan.name === currentPlanName) {
      message.info('Você já está neste plano!');
      return;
    }

    // Verifica se é downgrade (não permitido)
    if (plan.price <= currentPlanPrice && currentPlanPrice > 0) {
      message.warning(
        'Downgrade não é permitido manualmente. ' +
        'Seu plano será alterado automaticamente para Free ao final do ciclo caso não haja renovação.',
        5
      );
      return;
    }

    // Se for plano pago, verifica se o CPF/CNPJ já foi informado
    if (plan.price > 0) {
      try {
        const { data: profile } = await http.get('/user/profile');
        if (!profile.cpfCnpj) {
          setCpfModalOpen(true);
          return;
        }
      } catch {
        setCpfModalOpen(true);
        return;
      }
    }

    // Prossegue com a assinatura
    proceedWithSubscription();
  };

  if (loading) return <Spin size="large" style={{ display: 'block', marginTop: 50 }} />;

  const parseFeatures = (features: string | string[]): string[] => {
    if (Array.isArray(features)) return features;
    try {
      return JSON.parse(features);
    } catch {
      return [];
    }
  };

  const getColSpan = (total: number) => {
    if (total === 1) return 24;
    if (total === 2) return 12;
    return 8;
  };

  const colSpan = getColSpan(plans.length);

  const getPlanColors = (planName: string) => {
    const colors: Record<string, { border: string; text: string; bg: string }> = {
      Free: { border: '#01ff69', text: '#01ff69', bg: 'rgba(1, 255, 105, 0.1)' },
      Pro: { border: '#1890ff', text: '#1890ff', bg: 'rgba(24, 144, 255, 0.1)' },
      Premium: { border: '#722ed1', text: '#722ed1', bg: 'rgba(114, 46, 209, 0.1)' },
      Elite: { border: '#ff9f1a', text: '#ff9f1a', bg: 'rgba(255, 159, 26, 0.1)' },
    };
    return colors[planName] || { border: '#ff9f1a', text: '#ff9f1a', bg: 'rgba(255, 159, 26, 0.1)' };
  };

  return (
    <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Cabeçalho */}
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <Title level={2} style={{ color: '#ff9f1a', marginBottom: 8 }}>
          <CrownOutlined style={{ marginRight: 12 }} />
          Planos de Assinatura
        </Title>
        <Text style={{ color: '#aaa', fontSize: 16 }}>
          Escolha o plano ideal para o seu grupo e libere recursos avançados
        </Text>
      </div>

      {/* Banner informativo */}
      <div
        style={{
          textAlign: 'center',
          marginBottom: 24,
          padding: '12px 24px',
          backgroundColor: 'rgba(255, 159, 26, 0.1)',
          border: '1px solid #ff9f1a',
          borderRadius: 8,
        }}
      >
        <Text style={{ color: '#ff9f1a', fontSize: 14 }}>
          <StarFilled style={{ marginRight: 6 }} />
          Upgrade é aplicado imediatamente. O downgrade ocorre automaticamente ao final do ciclo caso não haja renovação.
        </Text>
      </div>

      {plans.length === 0 ? (
        <Card style={{ backgroundColor: '#1a1a1a', borderColor: '#333', textAlign: 'center' }}>
          <Text style={{ color: '#aaa' }}>Nenhum plano disponível no momento.</Text>
        </Card>
      ) : (
        <>
          <Row gutter={[24, 24]} justify="center">
            {plans.map((plan) => {
              const featureList = parseFeatures(plan.features);
              const isSelected = selectedPlan === plan.id;
              const isCurrentPlan = plan.name === currentPlanName;
              const isFree = plan.price === 0;
              const isUpgrade = plan.price > currentPlanPrice;
              const isDowngrade = plan.price < currentPlanPrice;
              const isSamePlan = plan.price === currentPlanPrice && !isCurrentPlan;
              const colors = getPlanColors(plan.name);

              return (
                <Col xs={24} sm={12} lg={colSpan} key={plan.id}>
                  <Card
                    style={{
                      backgroundColor: '#1a1a1a',
                      borderColor: isCurrentPlan
                        ? colors.border
                        : isSelected && isUpgrade
                          ? '#ff9f1a'
                          : '#333',
                      borderWidth: isCurrentPlan ? 3 : isSelected && isUpgrade ? 2 : 1,
                      borderRadius: 8,
                      cursor: isCurrentPlan || isDowngrade ? 'default' : 'pointer',
                      transition: 'all 0.3s',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      opacity: isDowngrade ? 0.6 : isCurrentPlan ? 1 : 0.85,
                      boxShadow: isCurrentPlan
                        ? `0 0 20px ${colors.border}40`
                        : 'none',
                      position: 'relative',
                    }}
                    onClick={() => {
                      if (!isCurrentPlan && !isDowngrade) {
                        setSelectedPlan(plan.id);
                      }
                    }}
                    styles={{ body: { flex: 1, display: 'flex', flexDirection: 'column' } }}
                  >
                    {/* Cabeçalho */}
                    <div style={{ textAlign: 'center', marginBottom: 20 }}>
                      <Title
                        level={3}
                        style={{
                          color: colors.text,
                          marginBottom: 4,
                          fontSize: isCurrentPlan ? 28 : 24,
                        }}
                      >
                        {plan.name}
                        {isSelected && !isCurrentPlan && isUpgrade && (
                          <StarFilled style={{ marginLeft: 8, color: '#ff9f1a' }} />
                        )}
                      </Title>
                      <Text style={{ color: '#aaa', fontSize: 13, minHeight: 40, display: 'block' }}>
                        {plan.description}
                      </Text>
                    </div>

                    {/* Preço */}
                    <div style={{ textAlign: 'center', marginBottom: 24 }}>
                      {isFree ? (
                        <Text style={{ fontSize: 36, fontWeight: 'bold', color: '#01ff69' }}>
                          Grátis
                        </Text>
                      ) : (
                        <>
                          <Text style={{ fontSize: 36, fontWeight: 'bold', color: '#fff' }}>
                            R$ {plan.price.toFixed(2).replace('.', ',')}
                          </Text>
                          <Text style={{ color: '#aaa', fontSize: 14 }}>/mês</Text>
                        </>
                      )}
                    </div>

                    {/* Features */}
                    <div style={{ flex: 1, marginBottom: 20 }}>
                      {featureList.map((feature, idx) => (
                        <div
                          key={idx}
                          style={{
                            marginBottom: 8,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '4px 0',
                          }}
                        >
                          <CheckCircleOutlined style={{ color: '#01ff69', fontSize: 16 }} />
                          <Text style={{ color: '#ccc', fontSize: 14, textTransform: 'capitalize' }}>
                            {feature.replace(/_/g, ' ')}
                          </Text>
                        </div>
                      ))}
                    </div>

                    {/* Limites */}
                    <div
                      style={{
                        marginTop: 'auto',
                        padding: '12px',
                        backgroundColor: '#222',
                        borderRadius: 6,
                        textAlign: 'center',
                      }}
                    >
                      <Text style={{ color: '#888', fontSize: 12, display: 'block' }}>
                        {plan.maxPlayers === -1
                          ? '🏐 Jogadores ilimitados'
                          : `🏐 Até ${plan.maxPlayers} jogadores`}
                      </Text>
                      <Text style={{ color: '#888', fontSize: 12, display: 'block', marginTop: 4 }}>
                        {plan.maxChampionships === -1
                          ? '🏆 Campeonatos ilimitados'
                          : plan.maxChampionships === 0
                            ? '🏆 Sem campeonatos'
                            : `🏆 Até ${plan.maxChampionships} campeonatos`}
                      </Text>
                    </div>

                    {/* Indicador de ação */}
                    {isCurrentPlan ? (
                      <Tag
                        color={colors.text}
                        style={{
                          width: '100%',
                          textAlign: 'center',
                          padding: '8px 0',
                          fontSize: 14,
                          marginTop: 12,
                          fontWeight: 'bold',
                          backgroundColor: colors.bg,
                          border: `1px solid ${colors.border}`,
                        }}
                      >
                        <CheckOutlined style={{ marginRight: 6 }} />
                        Este é o seu plano
                      </Tag>
                    ) : isDowngrade ? (
                      <Tooltip title="Downgrade não disponível manualmente. O plano será alterado automaticamente ao final do ciclo caso não haja renovação.">
                        <Button
                          type="default"
                          block
                          disabled
                          icon={<LockOutlined />}
                          style={{
                            marginTop: 12,
                            fontWeight: 'bold',
                            borderRadius: 6,
                            height: 40,
                            opacity: 0.5,
                          }}
                        >
                          Indisponível
                        </Button>
                      </Tooltip>
                    ) : isSelected ? (
                      <Tag
                        color="#ff9f1a"
                        style={{
                          width: '100%',
                          textAlign: 'center',
                          padding: '6px 0',
                          fontSize: 14,
                          marginTop: 12,
                          fontWeight: 'bold',
                        }}
                      >
                        <ArrowUpOutlined style={{ marginRight: 6 }} />
                        Selecionado para upgrade
                      </Tag>
                    ) : (
                      <Button
                        type="default"
                        block
                        icon={isUpgrade ? <ArrowUpOutlined /> : undefined}
                        style={{
                          marginTop: 12,
                          borderColor: colors.border,
                          color: colors.text,
                          fontWeight: 'bold',
                          borderRadius: 6,
                          height: 40,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPlan(plan.id);
                        }}
                      >
                        {isFree ? 'Usar Free' : 'Escolher Plano'}
                      </Button>
                    )}
                  </Card>
                </Col>
              );
            })}
          </Row>

          {/* Botão de confirmação */}
          {selectedPlan && (
            <div style={{ textAlign: 'center', marginTop: 40 }}>
              <Button
                type="primary"
                size="large"
                icon={<ArrowRightOutlined />}
                onClick={handleSubscribe}
                loading={subscribing}
                style={{
                  backgroundColor: '#ff9f1a',
                  borderColor: '#ff9f1a',
                  color: '#000',
                  fontWeight: 'bold',
                  borderRadius: 8,
                  height: 56,
                  fontSize: 18,
                  padding: '0 48px',
                  transition: 'all 0.3s',
                }}
              >
                {subscribing ? 'Processando...' : 'Confirmar Upgrade'}
              </Button>
              <Text style={{ display: 'block', color: '#888', marginTop: 12, fontSize: 13 }}>
                O upgrade é aplicado imediatamente após a confirmação do pagamento
              </Text>
            </div>
          )}
        </>
      )}

      {/* Modal de CPF/CNPJ */}
      <CpfCnpjModal
        open={cpfModalOpen}
        onClose={() => setCpfModalOpen(false)}
        onSuccess={proceedWithSubscription}
      />
    </div>
  );
}