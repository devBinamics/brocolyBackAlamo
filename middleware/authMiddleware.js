const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; 
  
    // API KEY o TOKEN FIJO
    const FIXED_API_KEY = process.env.API_KEY; 
  
    if (token == null) {
      return res.status(401).json({ error: 'No se proporcionó token de autorización' });
    }
  
    if (token !== FIXED_API_KEY) {
      return res.status(403).json({ error: 'Token inválido' });
    }
  
    // Si el token es correcto, continúa con la siguiente función (middleware o controlador)
    next();
  };
  
  module.exports = { authenticateToken };