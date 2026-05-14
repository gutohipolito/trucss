
class ShippingCalculator extends HTMLElement {
  constructor() {
    super();
    this.button = this.querySelector('.shipping-calculator__button');
    this.input = this.querySelector('.shipping-calculator__input');
    this.results = this.querySelector('.shipping-calculator__results');
    
    this.productPrice = parseFloat(this.getAttribute('data-product-price')) || 100;
    this.frenetToken = 'D2DDEDB9R5FF9R4891RAACBRF6A45B4521B3';
    this.sellerCEP = '08473470'; 
  }

  connectedCallback() {
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
    this.results.style.display = 'none';

    try {
      const geoResponse = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const geoData = await geoResponse.json();
      
      if (geoData.erro) {
        alert('CEP não encontrado.');
        return;
      }

      // Consulta direta na Frenet com PESO FIXO para evitar erro de cadastro
      const frenetBody = {
        "SellerCEP": this.sellerCEP,
        "RecipientCEP": cep,
        "ShipmentItemValue": this.productPrice,
        "ShippingItemArray": [
          {
            "Weight": 0.300, // Peso fixo de 300g (mínimo dos Correios)
            "Length": 16,    // Dimensões fixas padrão
            "Height": 11,
            "Width": 11,
            "Quantity": 1
          }
        ]
      };

      // Usando um proxy diferente e configurando a requisição para evitar bloqueio de CORS
      const response = await fetch('https://api.allorigins.win/raw?url=' + encodeURIComponent('https://api.frenet.com.br/shipping/quote'), {
        method: 'POST',
        headers: {
          'token': this.frenetToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(frenetBody)
      });

      if (!response.ok) throw new Error('Falha na resposta da Frenet');

      const data = await response.json();

      if (data.ShippingSevicesArray && data.ShippingSevicesArray.length > 0) {
        this.displayRealRates(data.ShippingSevicesArray, geoData);
      } else {
        this.displayFallbackRates(geoData);
      }

    } catch (e) {
      console.error('Erro no cálculo Frenet:', e);
      this.displayFallbackRates({ localidade: 'Sua região', uf: '' });
    } finally {
      this.button.disabled = false;
      this.button.innerText = originalText;
    }
  }

  displayRealRates(rates, location) {
    this.results.style.display = 'block';
    
    let html = `
      <p style="margin-bottom: 15px; font-size: 0.9rem; color: #666; border-bottom: 1px solid #eee; padding-bottom: 10px;">
        Entrega para: <strong>${location.localidade} - ${location.uf}</strong>
      </p>
    `;

    const validRates = rates.filter(r => !r.Error);

    if (validRates.length === 0) {
      this.displayFallbackRates(location);
      return;
    }

    validRates.forEach(rate => {
      const priceFormatted = parseFloat(rate.ShippingPrice).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      html += `
        <div class="shipping-calculator__result-item">
          <div style="display: flex; flex-direction: column;">
            <span style="font-weight: 500;">${rate.ServiceDescription}</span>
            <small style="color: #666;">Entrega em até ${rate.DeliveryTime} dias úteis</small>
          </div>
          <strong style="color: #000;">${priceFormatted}</strong>
        </div>
      `;
    });

    html += this.getNoticeHTML();
    this.results.innerHTML = html;
  }

  displayFallbackRates(location) {
    this.results.style.display = 'block';
    let html = `
      <p style="margin-bottom: 15px; font-size: 0.9rem; color: #666; border-bottom: 1px solid #eee; padding-bottom: 10px;">
        Entrega para: <strong>${location.localidade} - ${location.uf}</strong>
      </p>
      <p style="color: #c3002f; font-size: 0.85rem; background: rgba(195,0,47,0.05); padding: 10px; border-radius: 5px;">
        As transportadoras não retornaram valores para este CEP no momento. Por favor, tente novamente ou prossiga para o checkout.
      </p>
    `;
    html += this.getNoticeHTML();
    this.results.innerHTML = html;
  }

  getNoticeHTML() {
    return `
      <div style="margin-top: 15px; padding: 10px; background: #fff; border: 1px solid #eee; border-radius: 6px; font-size: 0.8rem; color: #777; line-height: 1.4;">
        * Lembre-se: O prazo acima é o tempo de entrega da transportadora e deve ser somado aos <strong>05 a 30 dias úteis</strong> de produção das peças.
      </div>
    `;
  }
}

if (!customElements.get('shipping-calculator')) {
  customElements.define('shipping-calculator', ShippingCalculator);
}
