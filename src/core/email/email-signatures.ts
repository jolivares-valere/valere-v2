/**
 * Firmas corporativas de email para Valere Consultores
 * Basado en las firmas HTML reales del equipo
 */

export interface AsesorSignatureData {
  nombre: string;
  apellidos: string;
  cargo: string;
  telefono: string;
  email: string;
  direccion: string;
  foto_url?: string;
}

const DIR_OFICINA = 'C/ Astronomia S/N, Torre 4<br/>Planta 1, Puerta 3<br/>41015 - Sevilla';

// Datos de los asesores (actualizar cuando se anadan nuevos)
export const ASESORES_DATA: Record<string, AsesorSignatureData> = {
  'jolivares@valereconsultores.com': {
    nombre: 'Juan Angel',
    apellidos: 'Olivares Pena',
    cargo: 'Desarrollo de negocios',
    telefono: '660486525',
    email: 'jolivares@valereconsultores.com',
    direccion: DIR_OFICINA,
    foto_url: 'https://consultoresvv.com/wp-content/uploads/2023/10/jolivares.png',
  },
  'arodriguez@valereconsultores.com': {
    nombre: 'Antonio',
    apellidos: 'Rodriguez Moreno',
    cargo: 'Desarrollo de negocios',
    telefono: '652946248',
    email: 'arodriguez@valereconsultores.com',
    direccion: DIR_OFICINA,
    foto_url: 'https://consultoresvv.com/wp-content/uploads/2023/10/arodriguez.png',
  },
  'administracion@valereconsultores.com': {
    nombre: 'Carolina',
    apellidos: 'Macineiras',
    cargo: 'Dpto. Administracion',
    telefono: '614293116',
    email: 'administracion@valereconsultores.com',
    direccion: DIR_OFICINA,
  },
  'soporte@valereconsultores.com': {
    nombre: 'Julia',
    apellidos: 'Ruiz',
    cargo: 'Dpto. Administracion',
    telefono: '614293116',
    email: 'soporte@valereconsultores.com',
    direccion: DIR_OFICINA,
  },
};

/**
 * Genera la firma HTML corporativa para un asesor
 */
export function generateSignature(asesor: AsesorSignatureData): string {
  const fotoHtml = asesor.foto_url
    ? `<td style="vertical-align: middle;" width="80">
        <img style="max-width: 80px; border-radius: 50%;" src="${asesor.foto_url}" width="80" height="80" />
       </td>
       <td width="15"></td>`
    : '';

  const telefonoHtml = asesor.telefono
    ? `<tr>
        <td style="vertical-align: middle;" width="24">
          <span style="display: inline-block; background-color: #13753c; border-radius: 50%; width: 20px; height: 20px; text-align: center; line-height: 20px;">
            <img src="https://cdn2.hubspot.net/hubfs/53/tools/email-signature-generator/icons/phone-icon-2x.png" alt="tel" width="10" style="vertical-align: middle;" />
          </span>
        </td>
        <td style="padding: 2px 0;"><a style="text-decoration: none; color: #393939; font-size: 12px;" href="tel:${asesor.telefono}">${asesor.telefono}</a></td>
       </tr>`
    : '';

  return `
    <table style="vertical-align: -webkit-baseline-middle; font-family: Arial, sans-serif; font-size: medium;" cellspacing="0" cellpadding="0">
      <tr>
        <td>
          <table cellspacing="0" cellpadding="0">
            <tr>
              ${fotoHtml}
              <td style="vertical-align: middle;">
                <h2 style="margin: 0; font-size: 16px; color: #393939; font-weight: 600;">${asesor.nombre} ${asesor.apellidos}</h2>
                <p style="margin: 0; color: #393939; font-size: 13px; line-height: 20px;">${asesor.cargo}</p>
                <p style="margin: 0; font-weight: 500; color: #13753c; font-size: 13px; line-height: 20px;">Valere Consultores</p>
              </td>
              <td width="20"></td>
              <td style="width: 1px; border-left: 1px solid #13753c;" height="60"></td>
              <td width="20"></td>
              <td style="vertical-align: middle;">
                <table cellspacing="0" cellpadding="0">
                  ${telefonoHtml}
                  <tr>
                    <td style="vertical-align: middle;" width="24">
                      <span style="display: inline-block; background-color: #13753c; border-radius: 50%; width: 20px; height: 20px; text-align: center; line-height: 20px;">
                        <img src="https://cdn2.hubspot.net/hubfs/53/tools/email-signature-generator/icons/email-icon-2x.png" alt="email" width="10" style="vertical-align: middle;" />
                      </span>
                    </td>
                    <td style="padding: 2px 0;"><a style="text-decoration: none; color: #393939; font-size: 12px;" href="mailto:${asesor.email}">${asesor.email}</a></td>
                  </tr>
                  <tr>
                    <td style="vertical-align: middle;" width="24">
                      <span style="display: inline-block; background-color: #13753c; border-radius: 50%; width: 20px; height: 20px; text-align: center; line-height: 20px;">
                        <img src="https://cdn2.hubspot.net/hubfs/53/tools/email-signature-generator/icons/address-icon-2x.png" alt="dir" width="10" style="vertical-align: middle;" />
                      </span>
                    </td>
                    <td style="padding: 2px 0; font-size: 12px; color: #393939;">${asesor.direccion}</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr><td height="15"></td></tr>
      <tr><td style="border-bottom: 1px solid #13753c;" height="1"></td></tr>
      <tr><td height="10"></td></tr>
    </table>`;
}

/**
 * Busca los datos de un asesor por email
 */
export function getAsesorData(email: string): AsesorSignatureData | null {
  return ASESORES_DATA[email] || null;
}
