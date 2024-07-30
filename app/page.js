"use client"
import { Box, Stack, Typography, Container, Paper, Button, Modal, TextField, IconButton, ThemeProvider, createTheme } from "@mui/material"
import { firestore } from "./firebase"
import { collection, query, getDocs, doc, setDoc, deleteDoc, updateDoc } from "firebase/firestore"
import { useEffect, useState } from "react"
import KitchenIcon from '@mui/icons-material/Kitchen'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'
import { getRecipeRecommendations } from './ai'

const theme = createTheme({
  palette: {
    primary: {
      main: '#023D54',
    },
    secondary: {
      main: '#94DEA5',
    },
    background: {
      default: '#f0f4f8',
    },
    text: {
      primary: '#023D54',
      secondary: '#94DEA5',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 700,
      color: '#023D54',
    },
    h6: {
      fontWeight: 500,
      color: '#023D54',
    },
    body1: {
      color: '#023D54',
    },
    body2: {
      color: '#023D54',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
  },
});

export default function Home() {
  const [pantry, setPantry] = useState([])
  const [open, setOpen] = useState(false)
  const [recipeModalOpen, setRecipeModalOpen] = useState(false)
  const [recipes, setRecipes] = useState([])
  const handleOpen = () => setOpen(true)
  const handleClose = () => setOpen(false)
  const [itemName, setItemName] = useState('')
  const [itemQuantity, setItemQuantity] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const updatePantry = async () => {
    const snapshot = query(collection(firestore, 'pantry'))
    const docs = await getDocs(snapshot)
    const pantryList = []
    docs.forEach((doc) => {
      const data = doc.data()
      pantryList.push({ id: doc.id, quantity: data.quantity || 0 })
    })
    console.log('Updated pantry:', pantryList)
    setPantry(pantryList)
  }

  useEffect(() => {
    updatePantry()
  }, [])

  useEffect(() => {
    console.log('Current pantry state:', pantry);
  }, [pantry]);

  const modalStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 400,
    bgcolor: 'background.paper',
    boxShadow: 24,
    p: 4,
    borderRadius: 3,
  };

  const addItem = async (item, quantity) => {
    const docRef = doc(collection(firestore, 'pantry'), item)
    await setDoc(docRef, { quantity: Number(quantity) })
    updatePantry()
  } 

  const removeItem = async (item) => {
    const docRef = doc(collection(firestore, 'pantry'), item)
    await deleteDoc(docRef)
    updatePantry()
  }

  const updateQuantity = async (item, newQuantity) => {
    if (newQuantity <= 0) {
      await removeItem(item)
    } else {
      const docRef = doc(collection(firestore, 'pantry'), item)
      await updateDoc(docRef, { quantity: Number(newQuantity) })
      updatePantry()
    }
  }

  const getRecipes = async () => {
    setIsLoading(true);
    setError(null);
    const ingredients = pantry.map(item => item.id);
    console.log('Ingredients before sending to API:', ingredients);
    
    if (ingredients.length === 0) {
      setError('No ingredients in pantry');
      setIsLoading(false);
      return;
    }
    
    try {
      console.log('Calling getRecipeRecommendations with ingredients:', ingredients);
      const recommendedRecipes = await getRecipeRecommendations(ingredients);
      console.log('Raw response from getRecipeRecommendations:', recommendedRecipes);
      
      if (!recommendedRecipes || recommendedRecipes.length === 0) {
        setError('No recipes were returned from the API.');
        setRecipes([]);
      } else if (recommendedRecipes[0].name === "Parsing Error") {
        setError('Error parsing API response. Raw response:');
        setRecipes(recommendedRecipes);
      } else {
        setRecipes(recommendedRecipes);
      }
      setRecipeModalOpen(true);
    } catch (error) {
      console.error('Error getting recipes:', error);
      setError(`Failed to get recipes. Error: ${error.message}`);
      setRecipes([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: 6 }}>
        <Container maxWidth="md">
          <Paper elevation={3} sx={{ borderRadius: 4, overflow: 'hidden', bgcolor: 'white' }}>
            <Box 
              bgcolor="primary.main" 
              color="white" 
              p={3} 
              display="flex" 
              alignItems="center" 
              justifyContent="space-between"
            >
              <Box display="flex" alignItems="center">
                <KitchenIcon sx={{ fontSize: 40, mr: 2 }} />
                <Typography variant="h4" color= 'white'>
                  Pantry Items
                </Typography>
              </Box>
              <Button 
                variant="contained" 
                onClick={handleOpen} 
                sx={{ bgcolor: 'secondary.main', color: 'primary.main', '&:hover': { bgcolor: 'secondary.light' } }}
              >
                Add Item
              </Button>
            </Box>
            
            <Box p={4} bgcolor="white" minHeight="60vh">
              <Stack spacing={2}>
                {pantry.length > 0 ? (
                  pantry.map((item) => (
                    <Paper
                      key={item.id}
                      elevation={0}
                      sx={{
                        p: 2,
                        transition: "all 0.3s",
                        '&:hover': {
                          transform: "translateY(-4px)",
                          boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                        },
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        border: '1px solid #e0e0e0',
                      }}
                    >
                      <Typography variant="h6" color="text.primary">
                        {item.id.charAt(0).toUpperCase() + item.id.slice(1)}
                      </Typography>
                      <Box display="flex" alignItems="center">
                        <IconButton onClick={() => updateQuantity(item.id, item.quantity - 1)} color="primary" size="small">
                          <RemoveIcon />
                        </IconButton>
                        <Typography variant="h6" sx={{ mx: 2, minWidth: '30px', textAlign: 'center' }}>{item.quantity}</Typography>
                        <IconButton onClick={() => updateQuantity(item.id, item.quantity + 1)} color="primary" size="small">
                          <AddIcon />
                        </IconButton>
                        <IconButton onClick={() => removeItem(item.id)} color="error" sx={{ ml: 2 }} size="small">
                          <DeleteOutlineIcon />
                        </IconButton>
                      </Box>
                    </Paper> 
                  ))
                ) : (
                  <Typography variant="body1" color="text.secondary" textAlign="center">
                    No items in the pantry. Add some groceries!
                  </Typography>
                )}
              </Stack>
              
              {pantry.length > 0 && (
                <Button 
                  variant="contained" 
                  onClick={getRecipes}
                  disabled={isLoading}
                  sx={{ 
                    mt: 4, 
                    bgcolor: 'secondary.main', 
                    color: 'primary.main', 
                    '&:hover': { bgcolor: 'secondary.light' },
                    display: 'block',
                    margin: '20px auto 0',
                    padding: '10px 20px',
                    fontSize: '1rem'
                  }}
                >
                  {isLoading ? 'Getting Recipes...' : `Get Recipe Recommendations with AI (${pantry.length} ingredients)`}
                </Button>
              )}
              {error && (
                <Typography color="error" textAlign="center" mt={2}>
                  {error}
                </Typography>
              )}
            </Box>
          </Paper>

          <Modal 
            open={open} 
            onClose={handleClose} 
            aria-labelledby="modal-modal-title" 
            aria-describedby="modal-modal-description"
          >
            <Box sx={modalStyle}> 
              <Typography id="modal-modal-title" variant="h5" component="h2" mb={3} color={"text.primary"}>
                Add Item to Pantry
              </Typography>
              <Stack spacing={3}>
                <TextField 
                  label="Item Name" 
                  variant="outlined" 
                  fullWidth={true} 
                  value={itemName} 
                  onChange={(e) => setItemName(e.target.value)}
                />
                <TextField 
                  label="Quantity" 
                  variant="outlined" 
                  type="number" 
                  fullWidth={true} 
                  value={itemQuantity} 
                  onChange={(e) => setItemQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  inputProps={{ min: 1 }}
                />
                <Button 
                  variant="contained" 
                  onClick={() => {
                    if (itemName.trim() !== '') {
                      addItem(itemName.trim(), itemQuantity)
                      setItemName('')
                      setItemQuantity(1)
                      handleClose()
                    }
                  }}
                  sx={{ bgcolor: 'secondary.main', color: 'primary.main', '&:hover': { bgcolor: 'secondary.light' } }}
                >
                  Add Item
                </Button>
              </Stack>
            </Box>
          </Modal>

          <Modal 
            open={recipeModalOpen} 
            onClose={() => setRecipeModalOpen(false)} 
            aria-labelledby="recipe-modal-title" 
            aria-describedby="recipe-modal-description"
          >
            <Box sx={modalStyle}> 
              <Typography id="recipe-modal-title" variant="h5" component="h2" mb={3} color="text.primary">
                Recipe Recommendations
              </Typography>
              <Stack spacing={3}>
                {recipes.length > 0 ? (
                  recipes[0].name === "Parsing Error" ? (
                    <Typography variant="body1" color="text.secondary">
                      {error}
                      <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {recipes[0].ingredients[0]}
                      </pre>
                    </Typography>
                  ) : (
                    recipes.map((recipe, index) => (
                      <Paper key={index} elevation={1} sx={{ p: 2 }}>
                        <Typography variant="h6" color="text.primary">{recipe.name}</Typography>
                        <Typography variant="body2" color="text.primary">
                          Ingredients: {recipe.ingredients.join(', ')}
                        </Typography>
                      </Paper>
                    ))
                  )
                ) : (
                  <Typography variant="body1" color="text.secondary">
                    {error || "No recipes found. Our AI couldn't generate recipes with the current ingredients. Try adding more varied ingredients to your pantry."}
                  </Typography>
                )}
              </Stack>
            </Box>
          </Modal>
        </Container>
      </Box>
    </ThemeProvider>
  )
}