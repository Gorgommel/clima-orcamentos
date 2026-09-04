# Clima Orçamentos

Aplicativo web móvel para criar e acompanhar orçamentos de instalação e manutenção de ar-condicionado diretamente no local do atendimento.

## Recursos atuais

- Orçamentos de instalação, manutenção corretiva e preventiva.
- Cadastro de cliente, telefone e endereço do serviço.
- Identificação do equipamento por capacidade, marca e modelo.
- Registro de detalhes técnicos, diagnóstico ou checklist.
- Captura e envio de fotos pelo celular.
- Composição de valores de serviço, materiais e mão de obra.
- Cálculo automático do total estimado.
- Itens editáveis com quantidade, unidade, valor unitário e subtotal.
- Condições de pagamento, prazo, inclusões, exclusões e observações editáveis.
- Geração de proposta comercial em PDF com duas páginas e área de assinaturas.
- Salvamento e consulta do histórico de orçamentos.
- Interface responsiva, otimizada para uso em dispositivos móveis.

## Tecnologias

- React 19 e TypeScript
- vinext/Vite
- Tailwind CSS
- Cloudflare Workers, D1 e R2 por meio do OpenAI Sites
- Drizzle ORM

## Executar localmente

Pré-requisito: Node.js 22.13 ou superior.

```bash
npm install
npm run dev
```

Abra no navegador o endereço local exibido pelo servidor de desenvolvimento.

Para validar uma versão de produção:

```bash
npm run build
```

Também estão disponíveis:

```bash
npm run lint
npm run format
```

## Dados e armazenamento

O projeto declara os bindings `DB` (Cloudflare D1) e `FILES` (Cloudflare R2) em `.openai/hosting.json`. No ambiente publicado, o D1 armazena os orçamentos e o R2 recebe os anexos enviados pelo aplicativo.

## Publicação e atualizações

O aplicativo está associado ao projeto **Clima Orçamentos** no OpenAI Sites. A configuração em `.openai/hosting.json` preserva o identificador do projeto e os bindings necessários. Atualizações devem ser compiladas, salvas como uma nova versão no Sites e somente depois implantadas. Cada atualização deve ser registrada neste repositório antes da publicação, mantendo um histórico recuperável das versões.

## Versão registrada

Este repositório começa com um snapshot da primeira versão publicada do aplicativo, acrescido apenas desta documentação. Nenhuma funcionalidade foi alterada no registro inicial.
