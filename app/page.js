"use client"
import { Box, Stack, Typography, Container, Paper, Button, Modal, TextField, IconButton, ThemeProvider, createTheme, Grid } from "@mui/material"
import { firestore } from "./firebase"
import { collection, query, getDocs, doc, setDoc, deleteDoc, updateDoc } from "firebase/firestore"
import { useEffect, useState } from "react"
import KitchenIcon from '@mui/icons-material/Kitchen'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'
import FavoriteIcon from '@mui/icons-material/Favorite'
import { getRecipeRecommendations } from './ai'

const theme = createTheme({
  palette: {
    primary: {
      main: '#3f51b5', // Indigo
      light: '#757de8',
      dark: '#002984',
    },
    secondary: {
      main: '#f50057', // Pink
    },
    background: {
      default: '#f5f5f5', // Light grey
      paper: '#ffffff',
    },
    text: {
      primary: '#333333',
      secondary: '#666666',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 700,
      fontSize: '2rem',
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.5rem',
    },
    h6: {
      fontWeight: 600,
      fontSize: '1.2rem',
    },
    body1: {
      fontSize: '1rem',
    },
    body2: {
      fontSize: '0.875rem',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          fontWeight: 600,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          color: '#3f51b5',
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
  const [favoriteRecipes, setFavoriteRecipes] = useState([])

  const updatePantry = async () => {
    const snapshot = query(collection(firestore, 'pantry'))
    const docs = await getDocs(snapshot)
    const pantryList = []
    docs.forEach((doc) => {
      const data = doc.data()
      pantryList.push({ id: doc.id, quantity: data.quantity || 0 })
    })
    setPantry(pantryList)
  }

  const updateFavoriteRecipes = async () => {
    const snapshot = query(collection(firestore, 'favoriteRecipes'))
    const docs = await getDocs(snapshot)
    const recipeList = []
    docs.forEach((doc) => {
      recipeList.push({ id: doc.id, ...doc.data() })
    })
    setFavoriteRecipes(recipeList)
  }

  useEffect(() => {
    updatePantry()
    updateFavoriteRecipes()
  }, [])

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
    
    if (ingredients.length === 0) {
      setError('No ingredients in pantry');
      setIsLoading(false);
      return;
    }
    
    try {
      const recommendedRecipes = await getRecipeRecommendations(ingredients);
      
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

  const addToFavorites = async (recipe) => {
    const docRef = doc(collection(firestore, 'favoriteRecipes'), recipe.name)
    await setDoc(docRef, recipe)
    updateFavoriteRecipes()
  }

  const removeFromFavorites = async (recipeId) => {
    const docRef = doc(collection(firestore, 'favoriteRecipes'), recipeId)
    await deleteDoc(docRef)
    updateFavoriteRecipes()
  }

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: 8 }}>
        <Container maxWidth="lg">
          <Typography variant="h4" component="h1" textAlign="center" mb={6} color="primary.main">
            Smart Pantry
          </Typography>
          <Grid container spacing={4}>
            {/* Pantry Section */}
            <Grid item xs={12} md={6}>
              <Paper elevation={0} sx={{ borderRadius: 4, overflow: 'hidden', transition: 'transform 0.3s', '&:hover': { transform: 'translateY(-4px)' } }}>
                <Box 
                  bgcolor="primary.main" 
                  color="white" 
                  p={3} 
                  display="flex" 
                  alignItems="center" 
                  justifyContent="space-between"
                >
                  <Box display="flex" alignItems="center">
                    <KitchenIcon sx={{ fontSize: 32, mr: 2 }} />
                    <Typography variant="h5" fontWeight="bold">
                      Pantry Items
                    </Typography>
                  </Box>
                  <Button 
                    variant="contained" 
                    onClick={handleOpen} 
                    size="large"
                    sx={{ 
                      bgcolor: 'white', 
                      color: 'primary.main',
                      '&:hover': { bgcolor: 'primary.light', color: 'white' },
                      fontWeight: 'bold',
                      px: 3,
                    }}
                  >
                    Add Item
                  </Button>
                </Box>
                
                <Box p={4} sx={{ maxHeight: '60vh', overflowY: 'auto' }}>
                  <Stack spacing={3}>
                    {pantry.length > 0 ? (
                      pantry.map((item) => (
                        <Paper
                          key={item.id}
                          elevation={0}
                          sx={{
                            p: 3,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            transition: 'all 0.3s',
                            '&:hover': {
                              transform: 'translateY(-2px)',
                              boxShadow: '0 6px 20px rgba(0, 0, 0, 0.1)',
                            },
                            borderRadius: 3,
                            bgcolor: 'background.default',
                          }}
                        >
                          <Typography variant="body1" fontWeight="500">
                            {item.id.charAt(0).toUpperCase() + item.id.slice(1)}
                          </Typography>
                          <Box display="flex" alignItems="center">
                            <IconButton 
                              color="primary"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            >
                              <RemoveIcon />
                            </IconButton>
                            <Typography variant="body1" fontWeight="500" mx={2}>
                              {item.quantity}
                            </Typography>
                            <IconButton 
                              color="primary"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            >
                              <AddIcon />
                            </IconButton>
                            <IconButton 
                              color="secondary" 
                              onClick={() => removeItem(item.id)}
                            >
                              <DeleteOutlineIcon />
                            </IconButton>
                          </Box>
                        </Paper>
                      ))
                    ) : (
                      <Typography variant="body1" color="text.secondary">
                        No items in pantry.
                      </Typography>
                    )}
                  </Stack>
                </Box>
              </Paper>
            </Grid>
            
            {/* Recipes Section */}
            <Grid item xs={12} md={6}>
              <Paper elevation={0} sx={{ borderRadius: 4, overflow: 'hidden', transition: 'transform 0.3s', '&:hover': { transform: 'translateY(-4px)' } }}>
                <Box 
                  bgcolor="secondary.main" 
                  color="white" 
                  p={3} 
                  display="flex" 
                  alignItems="center" 
                  justifyContent="space-between"
                >
                  <Box display="flex" alignItems="center">
                    <FavoriteIcon sx={{ fontSize: 32, mr: 2 }} />
                    <Typography variant="h5" fontWeight="bold">
                      Favorite Recipes
                    </Typography>
                  </Box>
                </Box>
                
                <Box p={4} sx={{ maxHeight: '60vh', overflowY: 'auto' }}>
                  <Stack spacing={3}>
                    {favoriteRecipes.length > 0 ? (
                      favoriteRecipes.map((recipe) => (
                        <Paper
                          key={recipe.id}
                          elevation={0}
                          sx={{
                            p: 3,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            transition: 'all 0.3s',
                            '&:hover': {
                              transform: 'translateY(-2px)',
                              boxShadow: '0 6px 20px rgba(0, 0, 0, 0.1)',
                            },
                            borderRadius: 3,
                            bgcolor: 'background.default',
                          }}
                        >
                          <Typography variant="body1" fontWeight="500">
                            {recipe.name}
                          </Typography>
                          <IconButton 
                            color="secondary" 
                            onClick={() => removeFromFavorites(recipe.id)}
                          >
                            <DeleteOutlineIcon />
                          </IconButton>
                        </Paper>
                      ))
                    ) : (
                      <Typography variant="body1" color="text.secondary">
                        No favorite recipes.
                      </Typography>
                    )}
                  </Stack>
                </Box>
              </Paper>
            </Grid>
          </Grid>

          {/* Add Item Modal */}
          <Modal
            open={open}
            onClose={handleClose}
            aria-labelledby="add-item-modal-title"
            aria-describedby="add-item-modal-description"
          >
            <Box sx={modalStyle}>
              <Typography id="add-item-modal-title" variant="h6" component="h2" mb={2}>
                Add Item
              </Typography>
              <TextField
                fullWidth
                label="Item Name"
                variant="outlined"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Quantity"
                variant="outlined"
                type="number"
                value={itemQuantity}
                onChange={(e) => setItemQuantity(e.target.value)}
                sx={{ mb: 2 }}
              />
              <Button 
                variant="contained" 
                onClick={() => {
                  addItem(itemName, itemQuantity)
                  handleClose()
                  setItemName('')
                  setItemQuantity(1)
                }}
                fullWidth
                sx={{
                  bgcolor: 'primary.main',
                  '&:hover': { bgcolor: 'primary.dark' },
                  color: 'white',
                  fontWeight: 'bold',
                }}
              >
                Add
              </Button>
            </Box>
          </Modal>

          {/* Recipe Modal */}
          <Modal
            open={recipeModalOpen}
            onClose={() => setRecipeModalOpen(false)}
            aria-labelledby="recipe-modal-title"
            aria-describedby="recipe-modal-description"
          >
            <Box sx={{ ...modalStyle, width: '80%', maxHeight: '80vh', overflowY: 'auto' }}>
              <Typography id="recipe-modal-title" variant="h6" component="h2" mb={2}>
                Recommended Recipes
              </Typography>
              {isLoading ? (
                <Typography variant="body1">Loading recipes...</Typography>
              ) : error ? (
                <Typography variant="body1" color="error">{error}</Typography>
              ) : recipes.length > 0 ? (
                recipes.map((recipe) => (
                  <Paper
                    key={recipe.name}
                    elevation={0}
                    sx={{
                      p: 3,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'all 0.3s',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 6px 20px rgba(0, 0, 0, 0.1)',
                      },
                      borderRadius: 3,
                      bgcolor: 'background.default',
                      mb: 2,
                    }}
                  >
                    <Box>
                      <Typography variant="body1" fontWeight="500">
                        {recipe.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Ingredients: {recipe.ingredients.join(', ')}
                      </Typography>
                    </Box>
                    <IconButton 
                      color="secondary" 
                      onClick={() => addToFavorites(recipe)}
                    >
                      <FavoriteIcon />
                    </IconButton>
                  </Paper>
                ))
              ) : (
                <Typography variant="body1" color="text.secondary">
                  No recipes found.
                </Typography>
              )}
            </Box>
          </Modal>
        </Container>
      </Box>
    </ThemeProvider>
  )
}
