
class ShippingCalculator extends HTMLElement {
  constructor() {
    super();
    this.button = this.querySelector('.shipping-calculator__button');
    this.input = this.querySelector('.shipping-calculator__input');
    this.results = this.querySelector('.shipping-calculator__results');
    
    // Dados do produto vindos do Liquid
    this.productPrice = parseFloat(this.getAttribute('data-product-price')) || 0;
    this.productWeight = parseFloat(this.getAttribute('data-product-weight')) || 0.5;
    
    // Configurações Frenet
    this.frenetToken = 'D2DDEDB9R5FF9R4891RAACBRF6A45B4521B3';
    this.sellerCEP = '01001000'; // CEP de Origem (Praça da Sé como padrão, alterável)

    if (this.button) {
      this.button.addEventListener('click', this.calculate.bind(this));
    }
    
    if (this.input) {
      this.input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.calculate();
        }
      });

      this.input.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 5) {
          value = value.slice(0, 5) + '-' + value.slice(5, 8);
        }
        e.target.value = value;
      });
    }
  }

  async calculate() {
    const cep = this.input.value.replace(/\D/g, '');
    if (cep.length !== 8) {
      alert('Por favor, informe um CEP válido com 8 dígitos.');
      return;
    }

    this.button.disabled = true;
    const originalText = this.button.innerText;
    this.button.innerText = 'Calculando...';

    try {
      // 1. Validar o CEP e pegar localidade (Opcional, mas bom para UX)
      const geoResponse = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const geoData = await geoResponse.json();
      
      if (geoData.erro) {
        alert('CEP não encontrado. Verifique os números e tente novamente.');
        this.results.style.display = 'none';
        return;
      }

      // 2. Chamar API da Frenet
      const frenetBody = {
        "SellerCEP": this.sellerCEP,
        "RecipientCEP": cep,
        "ShipmentItemValue": this.productPrice,
        "ShippingItemArray": [
          {
            "Weight": this.productWeight,
            "Length": 16,
            "Height": 11,
            "Width": 11,
            "Quantity": 1
          }
        ]
      };

      const response = await fetch('https://api.frenet.com.br/shipping/quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'token': this.frenetToken
        },
        body: JSON.stringify(frenetBody)
      });

      const data = await response.json();

      if (data.ShippingSevicesArray && data.ShippingSevicesArray.length > 0) {
        this.displayRates(data.ShippingSevicesArray, geoData);
      } else {
        alert('Não foram encontrados serviços de frete para este CEP.');
      }

    } catch (e) {
      console.error('Erro ao calcular frete Frenet:', e);
      alert('Houve um erro ao consultar a Frenet. Verifique sua conexão.');
    } finally {
      this.button.disabled = false;
      this.button.innerText = originalText;
    }
  }

  displayRates(rates, location) {
    this.results.style.display = 'block';
    
    let html = `
      <p style="margin-bottom: 15px; font-size: 0.9rem; color: #666; border-bottom: 1px solid #eee; padding-bottom: 10px;">
        Entrega para: <strong>${location.localidade} - ${location.uf}</strong>
      </p>
    `;
    
    // Filtrar apenas serviços válidos e sem erro
    const validRates = rates.filter(r => !r.Error);

    if (validRates.length === 0) {
      html += `<p style="color: #c3002f; font-size: 0.9rem;">Nenhuma transportadora disponível para este CEP.</p>`;
    } else {
      validRates.forEach(rate => {
        const price = parseFloat(rate.ShippingPrice).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        html += `
          <div class="shipping-calculator__result-item">
            <div style="display: flex; flex-direction: column;">
              <span style="font-weight: 500;">${rate.ServiceDescription}</span>
              <small style="color: #666;">Entrega em até ${rate.DeliveryTime} dias úteis</small>
            </div>
            <strong style="color: #000;">${price}</strong>
          </div>
        `;
      });
    }

    html += `
      <div style="margin-top: 15px; padding: 10px; background: #fff; border: 1px solid #eee; border-radius: 6px; font-size: 0.8rem; color: #777; line-height: 1.4;">
        * Lembre-se: O prazo acima é o tempo de entrega da transportadora e deve ser somado aos <strong>05 a 30 dias úteis</strong> de produção das peças.
      </div>
    `;

    this.results.innerHTML = html;
  }
}

if (!customElements.get('shipping-calculator')) {
  customElements.define('shipping-calculator', ShippingCalculator);
}
